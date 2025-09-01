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

    test('getAvailableQuests returns empty array when no rows match', async () => {
        const fakePlayer = { id: 99, level: 1, location: 'nowhere', faction: null, race: null, origin: null };
        db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const available = await Quest.getAvailableQuests(fakePlayer);
        expect(Array.isArray(available)).toBe(true);
        expect(available.length).toBe(0);
    });
});
