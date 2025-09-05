// backend/utils/locationUtils.js

/**
 * Calculates the distance between two geographical points (given in degrees of latitude and longitude)
 * using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    return distance;
};

/**
 * Checks if a location is within a certain radius of another location.
 * @param {number} centerLat Latitude of the center point
 * @param {number} centerLon Longitude of the center point
 * @param {number} pointLat Latitude of the point to check
 * @param {number} pointLon Longitude of the point to check
 * @param {number} radiusKm Radius in kilometers
 * @returns {boolean} True if the point is within the radius, false otherwise
 */
const isWithinRadius = (centerLat, centerLon, pointLat, pointLon, radiusKm) => {
    const distance = calculateDistanceKm(centerLat, centerLon, pointLat, pointLon);
    return distance <= radiusKm;
};

module.exports = {
    calculateDistanceKm,
    isWithinRadius
};