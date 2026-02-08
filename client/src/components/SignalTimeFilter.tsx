import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export type TimeRange = 'all' | '30days' | '90days' | 'custom';

interface SignalTimeFilterProps {
  onRangeChange: (range: TimeRange, customStart?: number, customEnd?: number) => void;
}

export default function SignalTimeFilter({ onRangeChange }: SignalTimeFilterProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleRangeSelect = (range: TimeRange) => {
    setSelectedRange(range);
    if (range !== 'custom') {
      onRangeChange(range);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const startTs = new Date(customStart).getTime();
      const endTs = new Date(customEnd).getTime();
      onRangeChange('custom', startTs, endTs);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">时间范围:</span>
      <div className="flex gap-2">
        <Button
          variant={selectedRange === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRangeSelect('all')}
        >
          全部
        </Button>
        <Button
          variant={selectedRange === '30days' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRangeSelect('30days')}
        >
          最近30天
        </Button>
        <Button
          variant={selectedRange === '90days' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRangeSelect('90days')}
        >
          最近90天
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={selectedRange === 'custom' ? 'default' : 'outline'}
              size="sm"
            >
              <Calendar size={14} className="mr-1" />
              自定义
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">开始日期</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">结束日期</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  handleCustomApply();
                  setSelectedRange('custom');
                }}
                className="w-full"
                disabled={!customStart || !customEnd}
              >
                应用
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
