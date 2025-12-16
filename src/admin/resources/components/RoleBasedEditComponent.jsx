import React from 'react';
import { Edit as DefaultEdit, useCurrentAdmin } from 'adminjs';

const RoleBasedEdit = (props) => {
    const [currentAdmin] = useCurrentAdmin();
    const isManager = currentAdmin?.role === 'manager';
    console.log('the role is manager ? is : ', isManager);

    // Clone the record and override properties for disabled fields
    const modifiedProps = {
        ...props,
        resource: {
            ...props.resource,
            properties: { ...props.resource.properties }, // keep as object
        },
    };

    if (isManager) {
        const disabledFields = [
            'name',
            'avatar',
            'phone',
            'userId',
            'isSuperAdmin',
            'credits',
            'totalChargedAmount',
        ];

        // For each field, set isDisabled dynamically
        disabledFields.forEach((field) => {
            if (modifiedProps.resource.properties[field]) {
                modifiedProps.resource.properties[field] = {
                    ...modifiedProps.resource.properties[field],
                    isDisabled: true,
                };
            }
        });
    }

    console.log('Fields and their isDisabled state:');
    Object.entries(modifiedProps.resource.properties).forEach(([key, prop]) => {
        console.log(key, '-> isDisabled:', prop.isDisabled || false);
    });

    return <DefaultEdit {...modifiedProps} />;
};

export default RoleBasedEdit;
