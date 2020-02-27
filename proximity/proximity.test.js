const LatLong = require('./proximity');

describe("Basic Tests", () => {
	test('latLong get/set', () => {
		const lat = -33.8934219;
		const long = 151.20404600000006;
		const latLong = new LatLong(lat, long);
		// should get back what was input
		expect(latLong.latitude).toBe(lat);
		expect(latLong.longitude).toBe(long);
	});
	test('distance sanity checks', () => {
		const pt1 = new LatLong(-33.8934219, 151.20404600000006);
		const pt2 = new LatLong(40.7486, -73.9864);
		// distance should be same in both directions
		expect(pt1.howFar(pt2)).toBe(pt2.howFar(pt1)); 
		// distance to self should be zero
		expect(pt1.howFar(pt1)).toBe(0);
		expect(pt2.howFar(pt2)).toBe(0);
		// self should be within any small distance
		expect(pt1.isPointWithinDistance(pt1, 0.0001)).toBe(true);
		// if pt2 is within pt1 distance, vice-versa should also be true
		expect(pt1.isPointWithinDistance(pt2, pt1.howFar(pt2) + 0.0001)).toBe(true);
		expect(pt2.isPointWithinDistance(pt1, pt2.howFar(pt1) + 0.0001)).toBe(true);
	});
	test('distance calculation checks', () => {
		const pt1 = new LatLong(-33.8934219, 151.20404600000006);
		const pt2 = new LatLong(40.7486, -73.9864);
		expect(pt1.howFar(pt2)).toBeCloseTo(15992.251);
	});
});
