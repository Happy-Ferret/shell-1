declare const imports: any;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const { GObject, St } = imports.gi;

import * as Lib from 'lib';
import * as Log from 'log';
import * as Settings from 'settings';

const { join, separator } = Lib;

export class Shortcut {
    description: string;
    schema_key: string | null;
    schema: number | null;

    constructor(description: string, schema_key: string | null, schema: number | null) {
        this.description = description;
        this.schema_key = schema_key;
        this.schema = schema;
    }
}

export class Section {
    header: string;
    shortcuts: Array<Shortcut>;

    constructor(header: string, shortcuts: Array<Shortcut>) {
        this.header = header;
        this.shortcuts = shortcuts;
    }
}

const SCHEMAS: Array<Settings.Settings> = [
    new Settings.Settings("org.gnome.settings-daemon.plugins.media-keys"),
    new Settings.Settings("org.gnome.shell.keybindings"),
];

const MEDIA_KEYS = 0;
const SHELL_KEYS = 1;

const SECTIONS: Array<Array<Section>> = [
    [
        new Section("System controls", [
            new Shortcut("Lock screen", "screensaver", MEDIA_KEYS),
            new Shortcut("Log out", "logout", MEDIA_KEYS),
            new Shortcut("Switch to the top bar", null, null),
            new Shortcut("Show the notification list", null, null),
            new Shortcut("Switch to the next input source", null, null),
        ]),
        new Section("Launchers", [
            new Shortcut("Show the activities overview", "toggle-overview", SHELL_KEYS),
            new Shortcut("Show the run command prompt", null, null),
            new Shortcut("Home folder", null, null),
            new Shortcut("Launch email client", null, null),
            new Shortcut("Launch terminal", null, null),
            new Shortcut("Launch web browser", null, null),

        ]),
        new Section("Manage window", [
            new Shortcut("Activate the window menu", null, null),
            new Shortcut("Close window", null, null),
            new Shortcut("Toggle maximization state", null, null),
            new Shortcut("Resize window", null, null),
            new Shortcut("Move window", null, null),
        ])
    ],

    [
        new Section("Navigate applications and windows", [
            new Shortcut("Open launcher", null, null),
            new Shortcut("Show all applications", "toggle-application-view", SHELL_KEYS),
            new Shortcut("Switch applications", null, null),
            new Shortcut("Switch windows of the same application", null, null),
            new Shortcut("Switch to window below", null, null),
            new Shortcut("Switch to window left", null, null),
            new Shortcut("Switch to window right", null, null),
            new Shortcut("Switch to window above", null, null),
            new Shortcut("Switch to monitor left", null, null),
            new Shortcut("Switch to monitor right", null, null),
        ]),
        new Section("Move window across monitors and workspaces", [
            new Shortcut("One monitor to the left", null, null),
            new Shortcut("One monitor to the right", null, null),
            new Shortcut("One workspace up", null, null),
            new Shortcut("One workspace down", null, null),
            new Shortcut("To first workspace", null, null),
            new Shortcut("To last workspace", null, null),
        ])
    ],

    [
        new Section("Window management mode", [
            new Shortcut("Activate the mode", null, null),
            new Shortcut("Move window down", null, null),
            new Shortcut("Move window left", null, null),
            new Shortcut("Move window right", null, null),
            new Shortcut("Move window up", null, null),
            new Shortcut("Resize window down", null, null),
            new Shortcut("Resize window up", null, null),
            new Shortcut("Resize window right", null, null),
            new Shortcut("Resize window left", null, null),
            new Shortcut("Snap window with one below", null, null),
            new Shortcut("Snap window with one to the left", null, null),
            new Shortcut("Snap window with one to the right", null, null),
            new Shortcut("Snap window with one above", null, null),
        ]),
        new Section("Navigate workspaces", [
            new Shortcut("Move to workspace above", null, null),
            new Shortcut("Move to workspace below", null, null),
            new Shortcut("Switch to first workspace", null, null),
            new Shortcut("Switch to last workspace", null, null),
        ])
    ]
]

export var ShortcutOverlay = GObject.registerClass(
    class ShortcutOverlay extends St.BoxLayout {
        title: string;

        constructor(title: string) {
            super()
            this.title = title;
        }

        _init(title: string) {
            super.init({
                styleClass: 'pop-shell-shortcuts',
                destroyOnClose: false,
                shellReactive: true,
                shouldFadeIn: true,
                shouldFadeOut: true,
            });

            let columns_layout = new St.BoxLayout({
                styleClass: 'pop-shell-shortcuts-columns',
                horizontal: true
            });

            for (const column of SECTIONS) {
                let column_layout = new St.BoxLayout({
                    styleClass: 'pop-shell-shortcuts-column',
                });

                for (const section of column) {
                    column_layout.add(this.gen_section(section));
                }

                columns_layout.add(column_layout);
            }

            this.add(new St.Label({
                styleClass: 'pop-shell-shortcuts-title',
                text: title
            }));

            this.add(columns_layout);

            // TODO: Add hyperlink for shortcuts in settings
        }

        gen_combination(combination: string) {
            let layout = new St.BoxLayout({
                styleClass: 'pop-shell-binding',
                horizontal: true
            });

            for (const key of parse_combination(combination)) {
                Log.debug(`parsed key: ${key}`);

                layout.add(St.Label({ text: key }));
            }

            return layout;
        }

        gen_section(section: Section) {
            let layout = new St.BoxLayout({
                styleclass: 'pop-shell-section',
            });

            layout.add(new St.Label({
                styleClass: 'pop-shell-section-header',
                text: section.header
            }));

            for (const subsection of section.shortcuts) {
                layout.add(separator());
                layout.add(this.gen_shortcut(subsection));
            }

            return layout;
        }

        gen_shortcut(shortcut: Shortcut) {
            if (shortcut.schema && shortcut.schema_key) {
                let layout = new St.BoxLayout({
                    styleClass: 'pop-shell-shortcut',
                    horizontal: true
                });

                layout.add(new St.Label({
                    text: shortcut.description
                }));

                let iterator = shortcuts(shortcut.schema, shortcut.schema_key);

                let first = iterator.next().value;

                if (first) {
                    layout.add(this.gen_combination(first));

                    for (const binding of iterator) {
                        layout.add(new St.Label({ text: 'or' }));
                        layout.add(this.gen_combination(binding));
                    }
                }

                return layout;
            }
        }
    }
)


function *shortcuts(schema: number, key: string): IterableIterator<string> {
    for (const value of SCHEMAS[schema].inner.get_strv(key)) {
        yield value;
    }
}

function* parse_combination(combination: string): IterableIterator<string> {
    let index = 0;

    while (index < combination.length) {
        if (combination[index] == '<') {
            let start = index + 1;
            while (combination[index] != '>') index += 1;
            yield combination.slice(start, index);
            index += 1;
        } else {
            yield combination.slice(index);
            break
        }
    }
}
