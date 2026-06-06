import { createContext, useContext, useState, type ReactNode } from 'react'

interface LayoutSubHeaderContextType {
  subHeader: ReactNode | null
  setSubHeader: (content: ReactNode | null) => void
}

const LayoutSubHeaderContext = createContext<LayoutSubHeaderContextType | undefined>(undefined)

export function LayoutSubHeaderProvider({ children }: { children: ReactNode }) {
  const [subHeader, setSubHeader] = useState<ReactNode | null>(null)

  return (
    <LayoutSubHeaderContext.Provider value={{ subHeader, setSubHeader }}>
      {children}
    </LayoutSubHeaderContext.Provider>
  )
}

export function useLayoutSubHeader() {
  const context = useContext(LayoutSubHeaderContext)
  if (context === undefined) {
    throw new Error('useLayoutSubHeader must be used within a LayoutSubHeaderProvider')
  }
  return context
}
