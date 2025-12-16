import React from 'react';
import { Box, Text } from '@adminjs/design-system';

const DiamondDisplay = (props) => {
  const { record, property } = props;
  const diamonds = record.params[property.path] || 0;

  return (
    <Box display="flex" alignItems="center" gap="sm">
      <Text fontSize="md" color="grey100" fontWeight="bold">
        {diamonds.toLocaleString()}
      </Text>
      <Text fontSize="sm" color="grey80">
        💎
      </Text>
    </Box>
  );
};

export default DiamondDisplay;
