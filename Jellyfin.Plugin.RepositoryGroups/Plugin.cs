using System;
using System.Collections.Generic;
using System.Globalization;
using Jellyfin.Plugin.RepositoryGroups.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.RepositoryGroups;

/// <summary>
/// Main entry point for the plugin repository grouping dashboard page.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">The Jellyfin application paths.</param>
    /// <param name="xmlSerializer">The Jellyfin XML serializer.</param>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    /// <inheritdoc />
    public override string Name => "Plugin Repository Groups";

    /// <inheritdoc />
    public override string Description => "Groups Jellyfin plugins by the repository that provides them.";

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("d671e4a5-5c86-4913-9311-b5b16db627b9");

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = "pluginrepositorygroups",
                DisplayName = Name,
                EnableInMainMenu = true,
                EmbeddedResourcePath = string.Format(
                    CultureInfo.InvariantCulture,
                    "{0}.Web.pluginrepositorygroups.html",
                    GetType().Namespace)
            },
            new PluginPageInfo
            {
                Name = "pluginrepositorygroupsjs",
                EmbeddedResourcePath = string.Format(
                    CultureInfo.InvariantCulture,
                    "{0}.Web.pluginrepositorygroups.js",
                    GetType().Namespace)
            }
        ];
    }
}

