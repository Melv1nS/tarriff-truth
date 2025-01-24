'use client';

import React, { useEffect, useState } from 'react';
import Select, { Props } from 'react-select';

export function ClientSelect<Option, IsMulti extends boolean = false>(
  props: Props<Option, IsMulti>
): React.ReactElement {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="w-full h-[42px] rounded-lg border border-slate-200 bg-white" />;
  }

  return (
    <Select
      {...props}
      classNames={{
        control: (state) =>
          `!min-h-[42px] !rounded-lg !border-slate-200 !shadow-none ${
            state.isFocused ? '!border-amber-500 !ring-2 !ring-amber-500' : ''
          }`,
        option: (state) => `!text-slate-700 ${state.isFocused ? '!bg-amber-50' : '!bg-white'}`,
        input: () => '!text-slate-700',
        singleValue: () => '!text-slate-700',
      }}
    />
  );
}
