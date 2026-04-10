export type Ecosystem = 'npm' | 'pypi' | 'crates' | 'go' | 'maven' | 'nuget';

const LANGUAGE_TO_ECOSYSTEM: Record<string, Ecosystem> = {
  typescript: 'npm',
  javascript: 'npm',
  scss: 'npm',
  css: 'npm',
  python: 'pypi',
  rust: 'crates',
  go: 'go',
  java: 'maven',
  csharp: 'nuget',
};

export function inferEcosystem(language: string | undefined): Ecosystem | undefined {
  if (language === undefined) return undefined;
  return LANGUAGE_TO_ECOSYSTEM[language];
}

export async function fetchPackageVersion(
  packageName: string,
  ecosystem: Ecosystem,
): Promise<string | undefined> {
  try {
    switch (ecosystem) {
      case 'npm': {
        const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
        if (!res.ok) return undefined;
        const data = (await res.json()) as { version: string };
        return data.version;
      }
      case 'pypi': {
        const res = await fetch(`https://pypi.org/pypi/${packageName}/json`);
        if (!res.ok) return undefined;
        const data = (await res.json()) as { info: { version: string } };
        return data.info.version;
      }
      case 'crates': {
        const res = await fetch(`https://crates.io/api/v1/crates/${packageName}`, {
          headers: { 'User-Agent': 'constellation-project-generator' },
        });
        if (!res.ok) return undefined;
        const data = (await res.json()) as { crate: { max_version: string } };
        return data.crate.max_version;
      }
      case 'go': {
        const res = await fetch(`https://proxy.golang.org/${packageName}/@latest`);
        if (!res.ok) return undefined;
        const data = (await res.json()) as { Version: string };
        return data.Version.replace(/^v/, '');
      }
      case 'maven': {
        const [group, artifact] = packageName.split(':');
        if (!group || !artifact) return undefined;
        const url = `https://search.maven.org/solrsearch/select?q=g:${group}+AND+a:${artifact}&rows=1&wt=json`;
        const res = await fetch(url);
        if (!res.ok) return undefined;
        const data = (await res.json()) as {
          response: { docs: Array<{ latestVersion: string }> };
        };
        return data.response.docs[0]?.latestVersion;
      }
      case 'nuget': {
        const res = await fetch(
          `https://api.nuget.org/v3-flatcontainer/${packageName.toLowerCase()}/index.json`,
        );
        if (!res.ok) return undefined;
        const data = (await res.json()) as { versions: string[] };
        return data.versions[data.versions.length - 1];
      }
    }
  } catch {
    return undefined;
  }
}

interface TechEntry {
  id: string;
  package?: string;
  ecosystem?: Ecosystem;
  language?: string;
}

interface CacheEntry {
  versions: Map<string, string>;
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cache: CacheEntry | null = null;

export function isCacheFresh(): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_TTL_MS;
}

export function getCachedVersion(techId: string): string | undefined {
  if (!isCacheFresh()) return undefined;
  return cache!.versions.get(techId);
}

export function clearVersionCache(): void {
  cache = null;
}

export async function fetchAllVersions(
  technologies: TechEntry[],
): Promise<Map<string, string>> {
  if (isCacheFresh()) {
    return cache!.versions;
  }

  const results = await Promise.allSettled(
    technologies.map(async (tech) => {
      const ecosystem = tech.ecosystem ?? inferEcosystem(tech.language);
      if (!ecosystem || !tech.package) return null;
      const version = await fetchPackageVersion(tech.package, ecosystem);
      return version ? { id: tech.id, version } : null;
    }),
  );

  const versions = new Map<string, string>();
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      versions.set(result.value.id, result.value.version);
    }
  }

  cache = { versions, timestamp: Date.now() };
  return versions;
}
