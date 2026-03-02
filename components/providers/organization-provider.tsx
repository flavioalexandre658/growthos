"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
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
  const params = useParams<{ slug?: string }>();
  const router = useRouter();

  const activeSlug = params?.slug ?? null;

  const switchOrganization = useCallback(
    (newSlug: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, newSlug);
      } catch {
      }
      router.push(`/${newSlug}`);
    },
    [router]
  );

  const organization =
    (activeSlug ? orgs?.find((o) => o.slug === activeSlug) : null) ??
    orgs?.[0] ??
    null;

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
