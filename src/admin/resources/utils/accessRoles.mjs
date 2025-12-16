export const allowedLimitedRoles = ['manager', 'support', 'pd'];

export const canAccessLimited = ({ currentAdmin }) => {
    return currentAdmin && allowedLimitedRoles.includes(currentAdmin.role);
};

export const limitedRoles = ['manager', 'support'];

export const AccessLimited = ({ currentAdmin }) => {
    return currentAdmin && allowedLimitedRoles.includes(currentAdmin.role);
};
