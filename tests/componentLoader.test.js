const path = require('path');
const { loadComponentsFromDir } = require('../src/utils/componentLoader');

describe('componentLoader', () => {
  test('loads single handler export', () => {
    const dir = path.join(__dirname, 'fixtures');
    const map = loadComponentsFromDir(dir);
    expect(map.has('single_handler')).toBe(true);
    expect(map.get('single_handler').customId).toBe('single_handler');
  });

  test('loads array handlers', () => {
    const dir = path.join(__dirname, 'fixtures');
    const map = loadComponentsFromDir(dir);
    expect(map.has('arr_1')).toBe(true);
    expect(map.has('arr_2')).toBe(true);
  });

  test('loads export map handlers', () => {
    const dir = path.join(__dirname, 'fixtures');
    const map = loadComponentsFromDir(dir);
    expect(map.has('main_handler')).toBe(true);
    expect(map.has('helper_handler')).toBe(true);
  });
});
