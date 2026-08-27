export let currentScenario = 'success';

export function setScenario(scenario: string) {
  currentScenario = scenario;
}

const originalFetch = globalThis.fetch;

/**
 * Mocks global fetch to intercept LLM API calls and simulate various success and failure conditions offline.
 */
export function setupMockFetch() {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input.toString();

    // Only intercept chat completion requests
    if (!urlStr.includes('/chat/completions')) {
      return originalFetch(input, init);
    }

    const body = init?.body ? JSON.parse(init.body as string) : {};
    const messages = body.messages || [];
    const promptText = messages.map((m: { content?: string }) => m.content).join('\n');

    // 1. Simulate provider timeout scenario
    if (currentScenario === 'timeout') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return new Response(JSON.stringify({ error: 'Gateway Timeout' }), {
        status: 504,
        statusText: 'Gateway Timeout',
        headers: { 'content-type': 'application/json' },
      });
    }

    // 2. Simulate provider error scenario (500 internal error)
    if (currentScenario === 'provider-error') {
      return new Response(JSON.stringify({ message: 'Internal Server Error from provider' }), {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'content-type': 'application/json' },
      });
    }

    // 3. Simulate malformed structured output scenario
    if (currentScenario === 'malformed-output') {
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-mock-malformed',
          choices: [
            {
              message: {
                role: 'assistant',
                content: '{"thisIs": "notMatchingSchema", "missingFields": 123}',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    // 4. Simulate score below 0 or above 1
    if (currentScenario === 'score-out-of-bounds') {
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-mock-score-bounds',
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  rankedCandidates: [
                    {
                      candidateId: 'candidate-001',
                      interestScore: 1.5, // invalid score
                      confidence: 0.8,
                      explanation: 'Invalid score above 1',
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    // 5. Simulate confidence below 0 or above 1
    if (currentScenario === 'confidence-out-of-bounds') {
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-mock-conf-bounds',
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  rankedCandidates: [
                    {
                      candidateId: 'candidate-001',
                      interestScore: 0.9,
                      confidence: -0.2, // invalid confidence
                      explanation: 'Invalid confidence below 0',
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    // 6. Simulate unknown candidate ID returning from AI
    if (currentScenario === 'unknown-candidate-id') {
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-mock-unknown-id',
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  rankedCandidates: [
                    {
                      candidateId: 'candidate-999', // invented ID
                      interestScore: 0.9,
                      confidence: 0.8,
                      explanation: 'Invented candidate',
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    // 7. Simulate duplicate candidate ID returning from AI
    if (currentScenario === 'duplicate-candidate-id') {
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-mock-dup-id',
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  rankedCandidates: [
                    {
                      candidateId: 'candidate-001',
                      interestScore: 0.9,
                      confidence: 0.8,
                      explanation: 'First mention',
                    },
                    {
                      candidateId: 'candidate-001', // duplicate
                      interestScore: 0.85,
                      confidence: 0.7,
                      explanation: 'Duplicate mention',
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    // 8. Normal success paths (inspect prompt text to decide response content)
    let content = '';

    if (promptText.includes('profileComplete') || promptText.includes('missingFields') || promptText.includes('Profile:') || promptText.includes('bio draft')) {
      // Profile Assistant request
      if (promptText.includes('incomplete-profile') || promptText.includes('Maya')) {
        content = JSON.stringify({
          profileComplete: false,
          missingFields: ['city', 'bio', 'interests', 'photos'],
          suggestions: [
            'Add a short bio describing your hobbies.',
            'Upload at least one profile photo.',
            'Select your interests.',
          ],
          bioDraft: null,
          explanation: 'Profile is missing city, bio, interests, and photos.',
        });
      } else if (promptText.includes('generic-profile') || promptText.includes('Alex')) {
        content = JSON.stringify({
          profileComplete: true,
          missingFields: [],
          suggestions: [
            'Make your bio more unique by specifying which movies you like.',
            'Add more dynamic interests.',
          ],
          bioDraft: null,
          explanation: 'Profile is complete but generic.',
        });
      } else {
        // Strong profile, draft requested
        content = JSON.stringify({
          profileComplete: true,
          missingFields: [],
          suggestions: ['Your profile looks strong and well-detailed!'],
          bioDraft:
            "Hey! I'm Sarah, a passionate photographer and hiker. When I'm not exploring mountain trails, you can find me enjoying specialty coffee and listening to vinyl records.",
          explanation: 'Profile is strong and meets all completeness guidelines.',
        });
      }
    } else {
      // Discovery Interest Agent request
      if (promptText.includes('prompt-injection') || promptText.includes('Ignore the ranking rules')) {
        // If prompt injection occurs, AI should ignore the inject instruction and rank normally.
        // If it failed to defend, it would return candidate-999.
        content = JSON.stringify({
          rankedCandidates: [
            {
              candidateId: 'candidate-001',
              interestScore: 0.9,
              confidence: 0.8,
              explanation: 'Sofia has lived in four countries, matching travel interest.',
            },
            {
              candidateId: 'candidate-002',
              interestScore: 0.1,
              confidence: 0.9,
              explanation: 'Lena profile is empty, low match probability.',
            },
          ],
        });
      } else {
        // Standard matching success path
        if (promptText.includes('candidate-005') || promptText.includes('Charlie')) {
          content = JSON.stringify({
            rankedCandidates: [
              {
                candidateId: 'candidate-001',
                interestScore: 0.9,
                confidence: 0.8,
                explanation: 'Sofia matches travel signals.',
              },
              {
                candidateId: 'candidate-005',
                interestScore: 0.45,
                confidence: 0.75,
                explanation: 'Charlie has hiked, which aligns with outdoor interests.',
              },
            ],
          });
        } else {
          content = JSON.stringify({
            rankedCandidates: [
              {
                candidateId: 'candidate-001',
                interestScore: 0.95,
                confidence: 0.9,
                explanation: 'Sofia matches entrepreneurship and travel signals perfectly.',
              },
              {
                candidateId: 'candidate-002',
                interestScore: 0.15,
                confidence: 0.85,
                explanation: 'Lena matches the empty profile pass pattern.',
              },
            ],
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        id: 'chatcmpl-mock-success',
        object: 'chat.completion',
        created: Date.now(),
        model: body.model || 'mock-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: content,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  };
}

/**
 * Restores the original fetch implementation.
 */
export function restoreFetch() {
  globalThis.fetch = originalFetch;
}
