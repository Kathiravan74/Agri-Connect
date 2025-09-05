// backend/validation/serviceRequestValidation.js
const validateServiceRequest = (data) => {
    let errors = {};
    let isValid = true;

    // Service Type validation
    if (!data.service_type || typeof data.service_type !== 'string' || !['ploughing', 'harvesting', 'spraying', 'other'].includes(data.service_type)) {
        errors.service_type = 'Valid service type (ploughing, harvesting, spraying, other) is required.';
        isValid = false;
    }

    // Required Date validation
    if (!data.required_date || typeof data.required_date !== 'string') {
        errors.required_date = 'Required date is missing or invalid.';
        isValid = false;
    } else {
        // Basic date format check (YYYY-MM-DD) and future date
        const date = new Date(data.required_date);
        if (isNaN(date.getTime())) { // Check if date is invalid
            errors.required_date = 'Invalid date format for required_date (use YYYY-MM-DD).';
            isValid = false;
        } else if (date < new Date()) { // Check if date is in the past
            // Allow today's date, but not past dates
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day
            if (date < today) {
                errors.required_date = 'Required date cannot be in the past.';
                isValid = false;
            }
        }
    }

    // Location Lat/Lon validation (optional for now, but good to have)
    if (data.location_lat !== undefined && (typeof data.location_lat !== 'number' || data.location_lat < -90 || data.location_lat > 90)) {
        errors.location_lat = 'Invalid latitude (must be a number between -90 and 90).';
        isValid = false;
    }
    if (data.location_lon !== undefined && (typeof data.location_lon !== 'number' || data.location_lon < -180 || data.location_lon > 180)) {
        errors.location_lon = 'Invalid longitude (must be a number between -180 and 180).';
        isValid = false;
    }

    // Budget validation
    if (data.budget !== undefined && (typeof data.budget !== 'number' || data.budget < 0)) {
        errors.budget = 'Budget must be a non-negative number.';
        isValid = false;
    }

    return {
        errors,
        isValid,
    };
};

module.exports = validateServiceRequest;