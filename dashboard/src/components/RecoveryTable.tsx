import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { RecoveryChartData } from '@/hooks/types';

interface RecoveryTableProps {
  data: RecoveryChartData;
}

const RecoveryTable: React.FC<RecoveryTableProps> = ({ data }) => {
  const { labels, datasets } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              {datasets.map((ds, idx) => (
                <TableHead key={idx}>{ds.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {labels.map((label, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell>{label}</TableCell>
                {datasets.map((ds, colIndex) => (
                  <TableCell key={colIndex}>{ds.data[rowIndex] ?? '-'}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RecoveryTable; 