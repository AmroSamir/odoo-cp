// No-op translation hook for static export (next-intl not available)
export const useTranslation = (_namespace?: string) => {
    return (key: string) => key
}

export default useTranslation
