const UNKNOWN_REPOSITORY = 'Unknown repository';
const BUNDLED_REPOSITORY = 'Bundled';

const state = {
    plugins: [],
    packages: [],
    repositories: [],
    status: 'installed',
    sort: 'name',
    search: ''
};

function normalizeId(value) {
    return String(value || '').replaceAll('-', '').toLowerCase();
}

function normalizeUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '').toLowerCase();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getApiJson(path) {
    const url = ApiClient.getUrl(path);

    if (typeof ApiClient.getJSON === 'function') {
        return ApiClient.getJSON(url);
    }

    return ApiClient.ajax({
        type: 'GET',
        url: url
    }).then(response => response.json());
}

function getRepositoryNameFromUrl(repositoryUrl) {
    const normalized = normalizeUrl(repositoryUrl);
    const repository = state.repositories.find(item => normalizeUrl(item.Url) === normalized);
    return repository?.Name;
}

function getMatchingVersion(packageInfo, installedVersion) {
    const versions = packageInfo?.versions || [];

    if (!versions.length) {
        return undefined;
    }

    if (installedVersion) {
        const matchingVersion = versions.find(item => item.version === installedVersion);

        if (matchingVersion) {
            return matchingVersion;
        }
    }

    return versions[0];
}

function getPackageMap() {
    return new Map(
        state.packages
            .filter(item => normalizeId(item.guid))
            .map(item => [normalizeId(item.guid), item])
    );
}

function getPluginMap() {
    return new Map(
        state.plugins
            .filter(item => normalizeId(item.Id))
            .map(item => [normalizeId(item.Id), item])
    );
}

function getEntryRepository(pluginInfo, packageInfo, versionInfo) {
    if (versionInfo?.repositoryName || versionInfo?.repositoryUrl) {
        return {
            name: versionInfo.repositoryName || getRepositoryNameFromUrl(versionInfo.repositoryUrl) || UNKNOWN_REPOSITORY,
            url: versionInfo.repositoryUrl || ''
        };
    }

    if (pluginInfo?.CanUninstall === false) {
        return {
            name: BUNDLED_REPOSITORY,
            url: ''
        };
    }

    if (packageInfo?.versions?.length) {
        const fallbackVersion = packageInfo.versions[0];
        return {
            name: fallbackVersion.repositoryName || getRepositoryNameFromUrl(fallbackVersion.repositoryUrl) || UNKNOWN_REPOSITORY,
            url: fallbackVersion.repositoryUrl || ''
        };
    }

    return {
        name: UNKNOWN_REPOSITORY,
        url: ''
    };
}

function buildEntries() {
    const packageById = getPackageMap();
    const pluginById = getPluginMap();
    const ids = new Set([...packageById.keys(), ...pluginById.keys()]);

    return [...ids].map(id => {
        const packageInfo = packageById.get(id);
        const pluginInfo = pluginById.get(id);
        const versionInfo = getMatchingVersion(packageInfo, pluginInfo?.Version);
        const repository = getEntryRepository(pluginInfo, packageInfo, versionInfo);
        const name = pluginInfo?.Name || packageInfo?.name || id;
        const installed = Boolean(pluginInfo?.Status);

        return {
            id: pluginInfo?.Id || packageInfo?.guid || id,
            name: name,
            description: pluginInfo?.Description || packageInfo?.description || packageInfo?.overview || '',
            installed: installed,
            status: pluginInfo?.Status || 'Not installed',
            version: pluginInfo?.Version || versionInfo?.version || '',
            category: packageInfo?.category || '',
            repositoryName: repository.name,
            repositoryUrl: repository.url
        };
    });
}

function filterEntries(entries) {
    const query = state.search.trim().toLowerCase();

    return entries.filter(entry => {
        if (state.status === 'installed' && !entry.installed) {
            return false;
        }

        if (state.status === 'available' && entry.installed) {
            return false;
        }

        if (!query) {
            return true;
        }

        return [
            entry.name,
            entry.description,
            entry.repositoryName,
            entry.category,
            entry.status,
            entry.version
        ].some(value => String(value || '').toLowerCase().includes(query));
    });
}

function groupEntries(entries) {
    const groups = new Map();

    entries.forEach(entry => {
        const key = `${entry.repositoryName}\n${entry.repositoryUrl}`;

        if (!groups.has(key)) {
            groups.set(key, {
                name: entry.repositoryName,
                url: entry.repositoryUrl,
                entries: []
            });
        }

        groups.get(key).entries.push(entry);
    });

    const sortedGroups = [...groups.values()];

    sortedGroups.forEach(group => {
        group.entries.sort((a, b) => a.name.localeCompare(b.name));
    });

    sortedGroups.sort((a, b) => {
        if (state.sort === 'count') {
            const countSort = b.entries.length - a.entries.length;

            if (countSort) {
                return countSort;
            }
        }

        return a.name.localeCompare(b.name);
    });

    return sortedGroups;
}

function getPluginHref(entry) {
    return `#/dashboard/plugins/${encodeURIComponent(entry.id)}?name=${encodeURIComponent(entry.name)}`;
}

function renderDescription(entry) {
    if (!entry.description) {
        return '';
    }

    return `<div class="repoPluginDescription">${escapeHtml(entry.description)}</div>`;
}

function renderGroup(group) {
    const rows = group.entries.map(entry => `
        <tr>
            <td>
                <a class="button-link repoPluginName" is="emby-linkbutton" href="${getPluginHref(entry)}">${escapeHtml(entry.name)}</a>
                ${renderDescription(entry)}
            </td>
            <td>${escapeHtml(entry.version || '-')}</td>
            <td class="repoStatus">${escapeHtml(entry.status)}</td>
            <td>${escapeHtml(entry.category || '-')}</td>
        </tr>
    `).join('');

    const repoUrl = group.url
        ? `<div class="repoGroupMeta repoGroupUrl"><a is="emby-linkbutton" class="button-link" href="${escapeHtml(group.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(group.url)}</a></div>`
        : '';

    return `
        <section class="repoGroup">
            <div class="repoGroupHeader">
                <h2 class="repoGroupTitle">${escapeHtml(group.name)}</h2>
                <div class="repoGroupMeta">${group.entries.length} ${group.entries.length === 1 ? 'plugin' : 'plugins'}</div>
                ${repoUrl}
            </div>
            <table class="repoPluginsTable">
                <colgroup>
                    <col style="width: 52%">
                    <col style="width: 14%">
                    <col style="width: 16%">
                    <col style="width: 18%">
                </colgroup>
                <thead>
                    <tr>
                        <th>Plugin</th>
                        <th>Version</th>
                        <th>Status</th>
                        <th>Category</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </section>
    `;
}

function render(view) {
    const filtered = filterEntries(buildEntries());
    const groups = groupEntries(filtered);
    const results = view.querySelector('#repoGroupsResults');
    const summary = view.querySelector('#repoGroupsSummary');

    summary.textContent = `${filtered.length} ${filtered.length === 1 ? 'plugin' : 'plugins'} across ${groups.length} ${groups.length === 1 ? 'repository' : 'repositories'}`;

    if (!filtered.length) {
        results.innerHTML = '<div class="repoEmpty">No plugins match the current filters.</div>';
        return;
    }

    results.innerHTML = groups.map(renderGroup).join('');
}

function showError(view, error) {
    const errorElement = view.querySelector('#repoGroupsError');
    errorElement.classList.remove('hide');
    errorElement.textContent = error?.message || 'Unable to load plugin repository data.';
}

function hideError(view) {
    const errorElement = view.querySelector('#repoGroupsError');
    errorElement.classList.add('hide');
    errorElement.textContent = '';
}

async function loadData(view) {
    hideError(view);
    Dashboard.showLoadingMsg();

    try {
        const [plugins, packages, repositories] = await Promise.all([
            getApiJson('Plugins'),
            getApiJson('Packages'),
            getApiJson('Repositories')
        ]);

        state.plugins = plugins || [];
        state.packages = packages || [];
        state.repositories = repositories || [];
        render(view);
    } catch (error) {
        console.error('[PluginRepositoryGroups] Unable to load plugin data', error);
        showError(view, error);
    } finally {
        Dashboard.hideLoadingMsg();
    }
}

function bindControls(view) {
    const statusSelect = view.querySelector('#repoGroupsStatus');
    const sortSelect = view.querySelector('#repoGroupsSort');
    const searchInput = view.querySelector('#repoGroupsSearch');
    const refreshButton = view.querySelector('#repoGroupsRefresh');

    statusSelect.addEventListener('change', () => {
        state.status = statusSelect.value;
        render(view);
    });

    sortSelect.addEventListener('change', () => {
        state.sort = sortSelect.value;
        render(view);
    });

    searchInput.addEventListener('input', () => {
        state.search = searchInput.value;
        render(view);
    });

    refreshButton.addEventListener('click', () => {
        loadData(view);
    });
}

export default function (view) {
    view.dispatchEvent(new CustomEvent('create'));
    bindControls(view);

    view.addEventListener('viewshow', () => {
        loadData(view);
    });
}

