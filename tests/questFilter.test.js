jest.mock('../src/config/database', () => ({
    query: jest.fn()
}));

const Quest = require('../src/database/models/Quest');
const db = require('../src/config/database');

describe('Quest filtering', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getAvailableQuests returns mapped Quest instances when rows present', async () => {
        const fakePlayer = { id: 42, level: 2, location: 'shells_town', faction: 'pirate', race: 'human', origin: 'shells_town' };

        const fakeRow = {
            id: 1,
            name: 'Test Quest',
            description: 'A quest for testing',
            arc: 'Test Arc',
            requirements: JSON.stringify({}),
            rewards: JSON.stringify({ experience: 10 }),
            difficulty: 1,
            max_level: null,
            min_level: 1,
            location: 'shells_town',
            is_daily: false,
            is_main_story: true
        };

        db.query.mockResolvedValueOnce({ rows: [fakeRow], rowCount: 1 });

        const results = await Quest.getAvailableQuests(fakePlayer);

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(1);
        expect(results[0].id).toBe(1);
        expect(results[0].name).toBe('Test Quest');
    });

    test('findAll returns all quests and is used by calling code as a fallback', async () => {
        // Simulate getAvailableQuests returning empty rows
        const fakePlayer = { id: 99, level: 1, location: 'nowhere', faction: null, race: null, origin: null };
        db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        // When findAll is called, return one row
        const allRow = {
            id: 2,
            name: 'All Quest',
            description: 'Fallback quest',
            arc: 'Fallback',
            requirements: JSON.stringify({}),
            rewards: JSON.stringify({ gold: 50 }),
            difficulty: 1,
            max_level: null,
            min_level: null,
            location: null,
            is_daily: false,
            is_main_story: false
        };

        // Next call (from findAll) should return fallback rows
        db.query.mockResolvedValueOnce({ rows: [allRow], rowCount: 1 });

    // Call getAvailableQuests first (will consume the first mock: empty result)
    const available = await Quest.getAvailableQuests(fakePlayer);
    expect(Array.isArray(available)).toBe(true);
    expect(available.length).toBe(0);

    // Then call findAll which will consume the second mock (fallback rows)
    const all = await Quest.findAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(2);
    });
});
