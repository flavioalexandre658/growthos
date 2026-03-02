"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useOrganizations } from "@/hooks/queries/use-organizations";
import type { IOrganization } from "@/interfaces/organization.interface";

const STORAGE_KEY = "growthos_active_org";

interface OrganizationContextValue {
  organization: IOrganization | null;
  organizations: IOrganization[];
  switchOrganization: (slug: string) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue>({
  organization: null,
  organizations: [],
  switchOrganization: () => {},
  isLoading: true,
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data: orgs, isLoading } = useOrganizations();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setActiveSlug(saved);
  }, []);

  useEffect(() => {
    if (!orgs || orgs.length === 0) return;
    if (!activeSlug) {
      setActiveSlug(orgs[0].slug);
    }
  }, [orgs, activeSlug]);

  const switchOrganization = useCallback((slug: string) => {
    setActiveSlug(slug);
    localStorage.setItem(STORAGE_KEY, slug);
  }, []);

  const organization =
    orgs?.find((o) => o.slug === activeSlug) ?? orgs?.[0] ?? null;

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizations: orgs ?? [],
        switchOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
