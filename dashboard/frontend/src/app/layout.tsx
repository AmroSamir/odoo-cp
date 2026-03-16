import ThemeProvider from '@/components/template/Theme/ThemeProvider'
import NavigationProvider from '@/components/template/Navigation/NavigationProvider'
import navigationConfig from '@/configs/navigation.config'
import { themeConfig } from '@/configs/theme.config'
import type { ReactNode } from 'react'
import '@/assets/styles/app.css'

export const metadata = {
    title: 'Odoo Manager',
    description: 'Odoo 19 Enterprise Management Dashboard',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode
}>) {
    return (
        <html suppressHydrationWarning>
            <body suppressHydrationWarning>
                <ThemeProvider theme={themeConfig}>
                    <NavigationProvider navigationTree={navigationConfig}>
                        {children}
                    </NavigationProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
