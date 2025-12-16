import React from 'react';
import { Box, Badge, Text, Icon } from '@adminjs/design-system';

const SalaryDisplay = (props) => {
  const { record, property } = props;
  const salary = record.params[property.path];
  const currentDiamonds = record.params.currentDiamonds || 0;

  // Simple color coding without fancy variants
  let variant = 'info';
  
  if (salary > 1000) {
    variant = 'success';
  } else if (salary > 500) {
    variant = 'secondary';
  } else if (salary > 100) {
    variant = 'primary';
  }

  return (
    <Box display="flex" alignItems="center" gap="sm">
      <Text fontSize="md" color="grey100" fontWeight="bold">
        ${salary?.toLocaleString() || '0'}
      </Text>
      <Text fontSize="sm" color="grey80">
        ({currentDiamonds?.toLocaleString() || '0'} 💎)
      </Text>
    </Box>
  );
};

export default SalaryDisplay;
