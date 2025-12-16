import React from 'react';
import { Box, Text, H3 } from '@adminjs/design-system';

const HostStatisticsDisplay = (props) => {
  const { record } = props;
  
  const currentDiamonds = record.params.currentDiamonds || 0;
  const monthlyDiamonds = record.params.monthlyDiamonds || 0;
  const dailyDiamonds = record.params.dailyDiamonds || 0;
  const salary = record.params.Salary || 0;
  const dailySalary = record.params.dailySalary || 0;
  const monthlySalary = record.params.monthlySalary || 0;

  const statisticsData = [
    { label: 'الماس الحالي', value: currentDiamonds.toLocaleString() },
    { label: 'الراتب المتاح', value: `$${salary.toLocaleString()}` },
    { label: 'ماس شهري', value: monthlyDiamonds.toLocaleString() },
    { label: 'ماس يومي', value: dailyDiamonds.toLocaleString() },
    { label: 'الراتب اليومي', value: `$${dailySalary.toLocaleString()}` },
    { label: 'الراتب الشهري', value: `$${monthlySalary.toLocaleString()}` }
  ];

  return (
    <Box bg="grey10" p="lg" borderRadius="md">
      <Box mb="lg">
        <H3 mb="lg" color="grey100">إحصائيات المضيف</H3>

        {/* Statistics Grid */}
        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="md">
          {statisticsData.map((stat, index) => (
            <Box 
              key={index}
              p="md" 
              bg="grey15" 
              borderRadius="sm"
              border="1px solid"
              borderColor="grey40"
            >
              <Text fontSize="sm" color="grey80" mb="xs">
                {stat.label}
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="grey100">
                {stat.value}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HostStatisticsDisplay;
