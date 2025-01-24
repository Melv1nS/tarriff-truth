'use client'

import React, { useEffect, useState } from 'react'
import Select, { Props } from 'react-select'

export function ClientSelect<
    Option,
    IsMulti extends boolean = false
>(props: Props<Option, IsMulti>): React.ReactElement {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return <div className="w-full h-[38px] rounded-md border border-neutral-200" />
    }

    return <Select {...props} />
} 