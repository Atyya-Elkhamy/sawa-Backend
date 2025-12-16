import React from 'react';
import { Box, Badge, Text } from '@adminjs/design-system';

const HostPerformanceSummary = (props) => {
  const { record } = props;
  const currentDiamonds = record.params.currentDiamonds || 0;
  const salary = record.params.Salary || 0;

  // Determine performance level for host
  let performanceLevel = 'مبتدئ';
  let performanceColor = 'info';
  
  if (currentDiamonds > 50000) {
    performanceLevel = 'خبير';
    performanceColor = 'success';
  } else if (currentDiamonds > 25000) {
    performanceLevel = 'متقدم';
    performanceColor = 'secondary';
  } else if (currentDiamonds > 10000) {
    performanceLevel = 'متوسط';
    performanceColor = 'primary';
  }

  return (
    <Box display="flex" flexDirection="column" gap="xs">
      <Badge variant={performanceColor} size="sm">
        {performanceLevel}
      </Badge>
      <Text fontSize="xs" color="grey80">
        ${salary.toLocaleString()} راتب
      </Text>
    </Box>
  );
};

export default HostPerformanceSummary;
