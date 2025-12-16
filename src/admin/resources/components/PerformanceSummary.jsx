import React from 'react';
import { Box, Text } from '@adminjs/design-system';

const PerformanceSummary = (props) => {
  const { record, property } = props;
  const totalHosts = record.params.totalHosts || 0;
  const currentDiamonds = record.params.currentDiamonds || 0;
  const salary = record.params.Salary || 0;


  return (
    <Box display="flex" flexDirection="column" gap="xs">
      <Text fontSize="sm" color="grey100">
        {totalHosts} مضيف | ${salary.toLocaleString()}
      </Text>
    </Box>
  );
};

export default PerformanceSummary;
