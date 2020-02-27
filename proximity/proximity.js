
const PlanetRadiusKm = 6371;
const PlanetRadiusMiles = PlanetRadiusKm * 0.621371192237334;

const MinLatDeg = -90;
const MaxLatDeg = 90;
const MinLongDeg = -180;
const MaxLongDeg = 180;

// converts degrees to radians
function degToRad(deg) {
	return deg * Math.PI / 180.0;
}

// converts radians to degrees
function radToDeg(rad) {
	return rad * 180.0 / Math.PI;
}

class LatLong {
	constructor(latDeg, longDeg) {
		if (latDeg < MinLatDeg || latDeg > MaxLatDeg)
			throw new Error(`Latitude ${latDeg} is out of bounds. Acceptable Range:[${MinLatDeg}, ${MaxLatDeg}]`);
		if (longDeg < MinLongDeg || longDeg > MaxLongDeg)
			throw new Error(`Longitude ${longDeg} is out of bounds. Acceptable Range: [${MinLongDeg}, ${MaxLongDeg}]`);
		this.latRad = degToRad(latDeg);
		this.longRad = degToRad(longDeg);
	}
	// getter for latitude. Returns the value in degrees
	get latitude() {
		return radToDeg(this.latRad);
	}
	// getter for longitude. Returns the value in degrees
	get longitude() {
		return radToDeg(this.longRad);
	}
	/**
	 * Checks if a given point is within a given distance on the GreatCircle
	 * @param {LatLong} point - the other point we are interested in checking
	 * @param {number} distance - the distance to compare against
	 * @param {boolean} inKm - `true` if distance is in KiloMeters, `false` to use Miles
	 * @returns true if the given point within certain given distance from the current point
	 */
	isPointWithinDistance(point, distance, inKm = true) {
		if (!point instanceof LatLong) throw new Error(`point should be of type LatLong`);
		return this.howFar(point, inKm) < distance;
	}
	/**
	 * how far is the given point to us?
	 * @param {LatLong} point - the other point to measure the distance to
	 * @param {boolean} inKm - `true` if return value should be in KiloMeters, `false` to get the return value in Miles
	 */
	howFar(point, inKm = true) {
		const radius = inKm ? PlanetRadiusKm : PlanetRadiusMiles;
		return radius * Math.acos(
			(Math.sin(this.latRad) * Math.sin(point.latRad)) +
			(Math.cos(this.latRad) * Math.cos(point.latRad) * Math.cos(this.longRad - point.longRad))
		);
	}
}

module.exports = LatLong;