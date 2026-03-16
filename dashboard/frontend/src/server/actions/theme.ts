'use client'

import { themeConfig } from '@/configs/theme.config'
import { COOKIES_KEY } from '@/constants/app.constant'
import type { Theme } from '@/@types/theme'

export async function getTheme(): Promise<Theme> {
    if (typeof window === 'undefined') {
        return themeConfig
    }

    try {
        const storedTheme = localStorage.getItem(COOKIES_KEY.THEME)
        if (storedTheme) {
            return JSON.parse(storedTheme).state
        }
    } catch {
        // ignore parse errors
    }

    return themeConfig
}

export async function setTheme(theme: string) {
    if (typeof window !== 'undefined') {
        localStorage.setItem(COOKIES_KEY.THEME, theme)
    }
}
