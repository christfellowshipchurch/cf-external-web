import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

interface NavbarVisibilityContextType {
  isNavbarVisible: boolean;
  setIsNavbarVisible: (visible: boolean) => void;
  /** True when the global site banner (below nav) is visible — affects sticky `top` offsets. */
  isSiteBannerVisible: boolean;
  setIsSiteBannerVisible: (visible: boolean) => void;
  /**
   * True while a finder (groups/classes) filter popover or bottom sheet is open.
   * Navbar freezes hide/show-on-scroll while the sheet/popover is up.
   */
  isFinderFilterOpen: boolean;
  setIsFinderFilterOpen: (open: boolean) => void;
  /**
   * Synchronous flag for scroll handlers. React state alone races the frame where
   * opening a filter would otherwise toggle navbar visibility before re-render.
   */
  isFinderFilterOpenRef: React.MutableRefObject<boolean>;
}

const NavbarVisibilityContext = createContext<
  NavbarVisibilityContextType | undefined
>(undefined);

export const NavbarVisibilityProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isSiteBannerVisible, setIsSiteBannerVisible] = useState(false);
  const [isFinderFilterOpen, setIsFinderFilterOpenState] = useState(false);
  const isFinderFilterOpenRef = useRef(false);

  const setIsFinderFilterOpen = useCallback((open: boolean) => {
    isFinderFilterOpenRef.current = open;
    setIsFinderFilterOpenState(open);
  }, []);

  return (
    <NavbarVisibilityContext.Provider
      value={{
        isNavbarVisible,
        setIsNavbarVisible,
        isSiteBannerVisible,
        setIsSiteBannerVisible,
        isFinderFilterOpen,
        setIsFinderFilterOpen,
        isFinderFilterOpenRef,
      }}
    >
      {children}
    </NavbarVisibilityContext.Provider>
  );
};

export const useNavbarVisibility = () => {
  const context = useContext(NavbarVisibilityContext);
  if (!context) {
    throw new Error(
      'useNavbarVisibility must be used within a NavbarVisibilityProvider',
    );
  }
  return context;
};
