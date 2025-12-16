import React from 'react';
import { Box, Text, H3, H4, Table, TableHead, TableRow, TableCell, TableBody } from '@adminjs/design-system';

const AgencyStatisticsDisplay = (props) => {
  const { record } = props;
  
  const totalHosts = record.params.totalHosts || 0;
  const currentDiamonds = record.params.currentDiamonds || 0;
  const monthlyDiamonds = record.params.monthlyDiamonds || 0;
  const dailyDiamonds = record.params.dailyDiamonds || 0;
  const agencyRank = record.params.agencyRank || 'N/A';
  const avgHostDiamonds = record.params.avgHostDiamonds || 0;
  const salary = record.params.Salary || 0;

  const statisticsData = [
    { label: 'إجمالي المضيفين', value: totalHosts },
    { label: 'الماس الحالي', value: currentDiamonds.toLocaleString() },
    { label: 'الراتب المتوقع', value: `$${salary.toLocaleString()}` },
    { label: 'ماس شهري', value: monthlyDiamonds.toLocaleString() },
    { label: 'ماس يومي', value: dailyDiamonds.toLocaleString() },
    { label: 'ترتيب الوكالة', value: `#${agencyRank}` },
    { label: 'متوسط ماس المضيف', value: avgHostDiamonds.toLocaleString() }
  ];

  return (
    <Box bg="grey10" p="lg" borderRadius="md">
      <Box mb="lg">
        <H3 mb="lg" color="grey100">إحصائيات الوكالة</H3>

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

      {/* Performance Metrics Table */}
      <Box>
        <H4 mb="md" color="grey100">مقاييس الأداء</H4>
        <Box bg="grey15" borderRadius="md" border="1px solid" borderColor="grey40">
          <Table>
            <TableHead>
              <TableRow bg="grey20">
                <TableCell><Text fontWeight="bold" color="grey100">المقياس</Text></TableCell>
                <TableCell><Text fontWeight="bold" color="grey100">القيمة</Text></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell><Text color="grey100">معدل النشاط</Text></TableCell>
                <TableCell><Text color="grey100">{totalHosts > 0 ? Math.round((monthlyDiamonds / Math.max(currentDiamonds, 1)) * 100) : 0}%</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text color="grey100">كفاءة المضيفين</Text></TableCell>
                <TableCell><Text color="grey100">{totalHosts > 0 ? Math.round(avgHostDiamonds) : 0} ماسة/مضيف</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text color="grey100">النمو اليومي</Text></TableCell>
                <TableCell><Text color="grey100">{dailyDiamonds.toLocaleString()} ماسة</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text color="grey100">الراتب الحالي</Text></TableCell>
                <TableCell><Text color="grey100">${salary.toLocaleString()}</Text></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
};

export default AgencyStatisticsDisplay;
