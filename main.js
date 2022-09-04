/**
 * A Configuration menu that allows the user to specify a *.map file
 * and a *.svg to build a world off of. This FormApplication will parse
 * the map file for all relevant information, and build a new scene to
 * represent all of the data gathered. Additionally will store data in
 * Journal Entries in order to make future referencing easier.
 */
class LoadAzgaarMap extends FormApplication {
    constructor(...args) {
        super(...args);
        game.users.apps.push(this);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: "Load Azgaar's Map",
            id: "azgaar-foundry",
            template: "modules/azgaar-foundry/templates/loadAzgaarsMap.html",
            closeOnSubmit: true,
            popOut: true,
            width: 600,
            height: 600,
            tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "main" }],
        });
    }
    /**
     * @return {object}    Object that contains all information necessary to render template.
     */
    async getData() {
        return {};
    }

    render(force, context = {}) {
        return super.render(force, context);
    }

    /**
     * Activate all of the listener's for the form, both Foundry
     * and custom ones.
     *
     * @param  {DOM} html    DOM of the Form Application (template)
     */
    activateListeners(html) {
        super.activateListeners(html);
        // Parse map whenever the file input changes.
        html.find("#map").change((event) => this.parseMap(event));
        // Trigger FilePicker for icon selection
        html.find("#azgaar-icon-select img").click((event) => this._onEditImage(event));

        html.find("#azgaar-map-select input[name='pictureMap']").change(async (event) => {
            const picture = $(event.currentTarget).val();
            let picWidth = 0;
            let picHeight = 0;

            await fetch(picture).then(async (response) => {
                return new Promise((resolve) => {
                    let sceneImg = new Image();
                    sceneImg.onload = () => {
                        picWidth = sceneImg.width;
                        picHeight = sceneImg.height;

                        this.picWidth = picWidth;
                        this.picHeight = picHeight;

                        // Enable submit button now that picture is loaded
                        html.find("button[type='submit']").prop("disabled", false);
                        resolve();
                    };

                    sceneImg.src = response.url;

                    // Disable submit button while picture is loading
                    html.find("button[type='submit']").prop("disabled", true);
                });
            });
        });

        // Update text based on input value.
        html.find("#azgaar-pin-fixer-select input[type=range]").change((event) => {
            const sVal = $(event.currentTarget).val();
            const zoomSpan = $(event.currentTarget).siblings("span");
            if (zoomSpan[0].id === "minZoomValue") {
                zoomSpan.text("Min Zoom Level: " + sVal);
            } else {
                zoomSpan.text("Max Zoom Level: " + sVal);
            }
        });

        // Revert to default zoom levels
        html.find("#azgaar-pin-fixer-select button").click((e) => {
            const defaults = [1, 2, 0.1, 2, 2, 3];
            html.find("#azgaar-pin-fixer-select .flexcol").each((i, event) => {
                if (i % 2 == 0) {
                    $(event)
                        .find("span")
                        .text("Min Zoom Level: " + defaults[i]);
                } else {
                    $(event)
                        .find("span")
                        .text("Max Zoom Level: " + defaults[i]);
                }
                $(event).find("input").val(defaults[i]);
            });
        });

        // Revert to default of "Observer" for all permission configs.
        html.find("#azgaar-permissions-select #permissionDefaults").click((e) => {
            html.find("#azgaar-permissions-select #permission-groups #permission2,#permission6,#permission10").each(
                (i, event) => {
                    $(event).prop("checked", "checked");
                }
            );
        });
    }

    /**
     * Load map file as text
     *
     * @param  {event} event    triggered by change of the "map" input
     * @return {Promise}        resolve once file is loaded.
     */
    loadMap(event) {
        return new Promise((resolve, reject) => {
            let input = $(event.currentTarget)[0];
            let fr = new FileReader();
            let file = input.files[0];

            fr.onload = () => {
                resolve(fr.result);
            };
            fr.readAsText(file);
        });
    }

    /**
     * Adhering to the data format of FMG, extract all valuable information
     * and save it to Memory.
     *
     * @param  {event} event    triggered by change of the "map" input
     * @return {Promise}        resolve() once all parsing is done
     */
    async parseMap(event) {
        // Load the file
        let text = await this.loadMap(event);
        /* Data format as presented in v1.4 of Azgaar's Fantasy Map Generator
    const data = [params, settings, coords, biomes, notesData, svg_xml,
      gridGeneral, grid.cells.h, grid.cells.prec, grid.cells.f, grid.cells.t, grid.cells.temp,
      features, cultures, states, burgs,
      pack.cells.biome, pack.cells.burg, pack.cells.conf, pack.cells.culture, pack.cells.fl,
      pop, pack.cells.r, pack.cells.road, pack.cells.s, pack.cells.state,
      pack.cells.religion, pack.cells.province, pack.cells.crossroad, religions, provinces,
      namesData, rivers].join("\r\n");
    */

        /* We are interested in the following fields, so extract them smartly (since order may change)
    Biomes: Biomes of the world (?)
    Cultures: Cultures
    States: Countries
    Burgs: Cities
    Religions: Relgions of the world
    Provinces: Group of Burgs in States
    namesData: Real world basis (culture) for countries/cultures.
    Rivers: Rivers
    */
        // Turn file into array of lines
        const lines = text.split(/[\r\n]+/g);

        // FMG Settings
        let firstLine = lines[0].split("|");
        // Extract FMG seed
        this.seed = firstLine[3];
        // Extract image size
        this.mapWidth = firstLine[4];
        this.mapHeight = firstLine[5];

        lines.forEach((line) => {
            try {
                // Only interested in JSON objects
                const obj = JSON.parse(line);

                /**
                 * Each JSON object is one of the following categories
                 * so here we determine which one it is, then assign
                 * the proper variables to it.
                 */

                // Provinces
                if ("state" in obj[1] && !("cell" in obj[1])) {
                    console.log("Provinces:", obj);
                    this.provinces = obj || [];
                } // Burgs
                else if ("population" in obj[1] && "citadel" in obj[1]) {
                    console.log("Burgs:", obj);
                    this.burgs = obj;
                }
                // These are our countries
                else if ("diplomacy" in obj[0]) {
                    console.log("Countries:", obj);
                    this.countries = obj;
                    // Religions
                } else if (obj[0].name === "No religion") {
                    console.log("Religions:", obj);
                    this.religions = obj;
                    // Cultures
                } else if (obj[0].name === "Wildlands") {
                    console.log("Cultures:", obj);
                    this.cultures = obj;
                    // Rivers
                } else if ("mouth" in obj[0]) {
                    console.log("Rivers:", obj);
                    this.rivers = obj;
                }
                // Many things in the file are not JSON, we don't care about them.
            } catch (error) {}
        });
    }

    /**
     * This method takes the data from memory and creates readable Journal
     * Entries out of it.
     *
     * @return {Promise}    resolve once all Foundry creations are done.
     */
    async importData() {
        return new Promise(async (resolve, reject) => {
            /**
             * Cultures
             */
            ui.notifications.notify("UAFMGI: Creating Journals for Cultures.");
            this.cultureComp = await compendiumUpdater("Cultures", "culture.hbs", this.cultures, {});

            let cultureLookup = this.cultures.map((culture) => {
                return {
                    id: culture.i,
                    name: culture.name,
                    journal: this.retrieveJournalByName({ type: "culture", name: culture.name }),
                };
            });

            /**
             * Provinces
             */
            let provinceLookup = [];
            if (this.provinces) {
                ui.notifications.notify("UAFMGI: Creating Journals for Provinces.");
                this.provinceComp = await compendiumUpdater("Provinces", "province.hbs", this.provinces, {});
                provinceLookup = this.provinces.map((province) => {
                    return {
                        id: province.i,
                        name: province.name,
                        burgs: province.burgs,
                        journal: this.retrieveJournalByName({ type: "province", name: province.name }),
                    };
                });
            }

            /**
             * Countries
             */
            ui.notifications.notify("UAFMGI: Creating Journals for Countries.");

            let countryData = this.countries.map((country) => {
                if (!(jQuery.isEmptyObject(country) || country.name === "Neutrals")) {
                    // TODO: Extrapolate Provinces, add Burgs?, Neighbors, Diplomacy, Campaigns?, Military?
                    let culture = cultureLookup[country.culture - 1];
                    country.culture = culture;
                    // Removed countries are still in Diplomacy as an X
                    if (country.diplomacy) {
                        country.diplomacy = country.diplomacy.filter((c) => c !== "x");
                    }
                    // for i in country.provinces
                    // map to actual province
                    if (this.provinces) {
                        let provinces = country.provinces?.map((provIndex) => provinceLookup[provIndex]);
                        country.selProvinces = provinces;
                    }
                }
                return country;
            });

            // ignore removed countries
            const renderCountryData = countryData.filter((c) => !c.removed);

            // We provide countryData a 2nd time in the "extraData" field because the "baseData"
            // field gets trimmed to a single entity when rendering.
            this.countryComp = await compendiumUpdater("Countries", "country.hbs", renderCountryData, {
                countries: renderCountryData,
            });

            let countryLookup = this.countries.map((country) => {
                return {
                    id: country.i,
                    name: country.name,
                    journal: this.retrieveJournalByName({ type: "country", name: country.name }),
                };
            });

            /**
             * Burgs
             */
            ui.notifications.notify("UAFMGI: Creating Journals for Burgs.");
            const burgData = this.burgs.map((burg, i) => {
                if (burg !== 0 && !jQuery.isEmptyObject(burg)) {
                    burg.culture = cultureLookup[burg.culture - 1];
                    burg.country = countryLookup[burg.state];
                    burg.province = provinceLookup.find((province) => province.burgs?.includes(burg.i));
                    burg.burgURL = this.generateBurgURL(burg, i);
                }
                return burg;
            });

            this.burgComp = await compendiumUpdater("Burgs", "burg.hbs", burgData, {});

            const burgLookup = this.burgs.map((burg, i) => {
                return {
                    id: burg.i,
                    name: burg.name,
                    journal: this.retrieveJournalByName({ type: "burg", name: burg.name }),
                };
            });

            // We have a circular dependency on everything so provinces kinda get shafted in the initial journals
            // so here we update them to hold all sorts of information

            if (this.provinces) {
                const provinceData = this.provinces.map((province, i) => {
                    if (province !== 0 && !jQuery.isEmptyObject(province)) {
                        province.country = countryLookup[province.state];
                        province.burgs = province.burgs?.map((id) => burgLookup[id]);
                    }
                    return province;
                });
                this.provinceComp = await compendiumUpdater("Provinces", "province.hbs", provinceData, {});
            }

            resolve();
        });
    }

    /**
     * Make a new scene with the picture as the background
     *
     * @param  {string} picture    File path to the picture asset
     * @return {Scene}         New Scene to work on
     */
    async makeScene(picture) {
        return new Promise(async (resolve, reject) => {
            let sceneName = picture.split("%20")[0].split(".(svg|png|jpg|jpeg|webm)")[0];

            const ogWidth = parseInt(this.mapWidth);
            const ogHeight = parseInt(this.mapHeight);

            const newWidth = this.picWidth;
            const newHeight = this.picHeight;

            const widthMultiplier = newWidth / ogWidth;
            const heightMultiplier = newHeight / ogHeight;

            //Create The Map Scene
            let sceneData = await Scene.create({
                name: sceneName,
                width: this.picWidth,
                height: this.picHeight,
                padding: 0.0,
                img: picture,
                // Flags for making pinfix work immediately.
                "flags.pinfix.enable": true,
                "flags.pinfix.minScale": 1,
                "flags.pinfix.maxScale": 1,
                "flags.pinfix.zoomFloor": 0.1,
                "flags.pinfix.zoomCeil": 3,
                "flags.pinfix.hudScale": 1,
            });

            await sceneData.activate();

            resolve([sceneData, widthMultiplier, heightMultiplier]);
        });
    }

    /**
     * Handle changing the icons by opening a FilePicker
     * @private
     */
    _onEditImage(event) {
        const fp = new FilePicker({
            type: "image",
            callback: (path) => {
                event.currentTarget.src = path;
            },
            top: this.position.top + 40,
            left: this.position.left + 10,
        });
        return fp.browse();
    }

    /**
     * Find an object by searching through compendiums (Foundry db)
     *
     * @param  {String} type    Type of object to find
     * @param  {String} name    Name of object to find
     * @return {object}         Found Object
     */
    retrieveJournalByName({ type = "burg", name = "" }) {
        let searchable;
        if (type === "burg") {
            searchable = this.burgComp;
        } else if (type === "country") {
            searchable = this.countryComp;
        } else if (type === "culture") {
            searchable = this.cultureComp;
        } else if (type === "province") {
            searchable = this.provinceComp;
        }

        let journal = searchable.find((elem) => elem.name === name);

        return journal;
    }

    generateBurgURL(burg, id) {
        id = id.toString();
        const seed = this.seed + id.padStart(4, 0);
        const site = "http://fantasycities.watabou.ru/?random=0&continuous=0";
        const pop = ("" + burg.population).replace(".", "");
        const url = `${site}&name=${
            burg.name
        }&population=${+pop}&size=${+burg.size}&seed=${seed}&coast=${+burg.coast}&citadel=${+burg.citadel}&plaza=${+burg.plaza}&temple=${+burg.temple}&walls=${+burg.walls}&shantytown=${+burg.shanty}`;
        return url;
    }

    /**
     * Automatically called by Foundry upon submission of FormApplication
     * Controls the process of creating everything. Scene, data, notes, etc.
     *
     * @param  {event} event        event that triggered this call, usually a click
     * @param  {String} formData    HTML of the form that was submitted
     * @return {None}               Foundry expects it to return something.
     */
    async _updateObject(event, formData) {
        // Make a journal entry to tie fake notes to or find the old one
        // If no "real" journal entry is provided than the map notes fail
        // to show up, hence why this block of code exists.

        // TODO: Investigate better way than adding a random journal entry.
        let azgaarJournal = game.journal.getName("Azgaar FMG");
        if (!azgaarJournal) {
            let fakeJournal = {
                content: `This journal entry is necessary for the azgaar-foundry importer to work properly. 
                          Please check the world's compendiums for your world's contents.
                          If you are not the GM, then you are not allowed to view the contents of the Note
                          you have selected.`,
                name: "Azgaar FMG",
                permission: { default: 2 },
            };
            azgaarJournal = await JournalEntry.create(fakeJournal);
        }

        // Make the scene
        let picture = this.element.find('[name="pictureMap"]').val();
        if (!picture) {
            ui.notifications.error("[Azgaar FMG] You must attach a picture and a map file to the form.");
            return;
        }
        let [scene, widthMultiplier, heightMultiplier] = await this.makeScene(picture);

        // get icons to use for notes
        const burgSVG = this.element.find("#burgSVG").attr("src");
        const countrySVG = this.element.find("#countrySVG").attr("src");
        const provinceSVG = this.element.find("#provinceSVG").attr("src");

        // get permissions to use
        const burgPerm = parseInt(this.element.find("[name='permissionBurg']:checked").val());
        const countryPerm = parseInt(this.element.find("[name='permissionCountry']:checked").val());
        const provincePerm = parseInt(this.element.find("[name='permissionProvince']:checked").val());

        // import our data
        await this.importData();

        const [countryMinZoom, countryMaxZoom] = this.element
            .find("#azgaar-pin-fixer-select #countries input")
            .map((i, input) => input.value);

        let useColor = this.element.find("#azgaar-icon-select #countries input#iconColors").is(":checked");
        // Start prepping notes
        let countryData = this.countries.map((country) => {
            if (country.name === "Neutrals") return;
            if (country.removed) return;
            let journalEntry = this.retrieveJournalByName({
                type: "country",
                name: country.name,
            });

            let xpole,
                ypole = 0;
            if (country.pole) {
                xpole = country.pole[0];
                ypole = country.pole[1];
            }

            // Assemble data required for notes
            return {
                entryId: azgaarJournal.id,
                x: xpole * widthMultiplier,
                y: ypole * heightMultiplier,
                icon: countrySVG,
                iconSize: 32,
                iconTint: useColor ? country.color : "#00FF000",
                text: country.name,
                fontSize: 24,
                textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
                textColor: "#00FFFF",
                "flags.pinfix.minZoomLevel": countryMinZoom,
                "flags.pinfix.maxZoomLevel": countryMaxZoom,
                "flags.azgaar-foundry.journal": { compendium: "world.Countries", journal: journalEntry?.id },
                "flags.azgaar-foundry.permission": { default: countryPerm },
            };
        });

        const [provinceMinZoom, provinceMaxZoom] = this.element
            .find("#azgaar-pin-fixer-select #provinces input")
            .map((i, input) => input.value);

        useColor = this.element.find("#azgaar-icon-select #provinces input#iconColors").is(":checked");
        let provinceData = [];
        if (this.provinces) {
            provinceData = this.provinces.map((province) => {
                if (province === 0 || province.removed) return; // For some reason there's a 0 at the beginning.
                let journalEntry = this.retrieveJournalByName({
                    type: "province",
                    name: province.name,
                });

                // Some provinces do not have a burg... For now we skip those.
                if (province.burg === 0) return;
                let centerBurg = this.burgs.find((burg) => burg.i === province.burg);

                // Assemble data required for notes
                return {
                    entryId: azgaarJournal.id,
                    x: centerBurg.x * widthMultiplier,
                    y: centerBurg.y * heightMultiplier,
                    icon: provinceSVG,
                    iconSize: 32,
                    iconTint: useColor ? province.color : "#00FF000",
                    text: province.name,
                    fontSize: 24,
                    textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
                    textColor: "#00FFFF",
                    "flags.pinfix.minZoomLevel": provinceMinZoom,
                    "flags.pinfix.maxZoomLevel": provinceMaxZoom,
                    "flags.azgaar-foundry.journal": { compendium: "world.Provinces", journal: journalEntry?.id },
                    "flags.azgaar-foundry.permission": { default: provincePerm },
                };
            });
        }

        const [burgMinZoom, burgMaxZoom] = this.element
            .find("#azgaar-pin-fixer-select #burgs input")
            .map((i, input) => input.value);

        useColor = this.element.find("#azgaar-icon-select #burgs input#iconColors").is(":checked");
        let burgData = this.burgs.map((burg) => {
            if (jQuery.isEmptyObject(burg)) return; // For some reason there's a {} at the beginning.
            if (burg.removed) return;
            let journalEntry = this.retrieveJournalByName({ name: burg.name });

            // Assemble data required for notes
            return {
                // entryId must be a valid journal entry (NOT from compendium, otherwise things really break.)
                entryId: azgaarJournal.id,
                x: burg.x * widthMultiplier,
                y: burg.y * heightMultiplier,
                icon: burgSVG,
                iconSize: 32,
                iconTint: useColor ? burg.color : "#00FF000",
                text: burg.name,
                fontSize: 24,
                textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
                textColor: "#00FFFF",
                "flags.pinfix.minZoomLevel": burgMinZoom,
                "flags.pinfix.maxZoomLevel": burgMaxZoom,
                "flags.azgaar-foundry.journal": { compendium: "world.Burgs", journal: journalEntry?.id },
                "flags.azgaar-foundry.permission": { default: burgPerm },
            };
        });

        // Remove all falsy values.
        countryData = countryData.filter(Boolean);
        provinceData = provinceData.filter(Boolean);
        burgData = burgData.filter(Boolean);

        // Make all of our notes, in one call to the db.
        await canvas.scene.createEmbeddedDocuments("Note", [...countryData, ...provinceData, ...burgData]);
        return;
    }
}

async function compendiumUpdater(compType, contentSchema, baseData, extraData) {
    // Assumptions for updating
    // 1. Same number of entities (be it is, countries, burgs, whatever)
    // 2. all entities already exist (no new ones!)
    if (!baseData) return;

    let comp;
    let oldIds = [];
    if (game.packs.get("world." + compType)) {
        // empty the content
        const oldCComp = game.packs.get("world." + compType);
        const oldCCompContent = await oldCComp.getDocuments();
        let jIds = oldCCompContent
            .sort((a, b) => a["data"]["flags"]["azgaar-foundry"]["i"] - b["data"]["flags"]["azgaar-foundry"]["i"])
            .map((journal) => journal.id);
        console.log(jIds);
        oldIds = jIds;
        comp = oldCComp;
    } else {
        comp = await CompendiumCollection.createCompendium({ name: compType, label: compType, entity: "JournalEntry" });
        baseData.shift(); // remove first element, usually blank or a "remainder".
    }

    let compData = await Promise.all(
        baseData.map(async (i) => {
            // items that have been removed are missing some properties that cause failures
            // but these are signified by having a "removed" property on them with a value
            // of true
            if (!jQuery.isEmptyObject(i)) {
                if (!("removed" in i && i.removed === true)) {
                    let content = await renderTemplate("modules/azgaar-foundry/templates/" + contentSchema, {
                        iter: i,
                        extras: extraData,
                    });
                    if (i.name) {
                        let journal = {
                            content: content,
                            name: i.name,
                            "flags.azgaar-foundry.i": i.i,
                        };
                        if (oldIds.length === 0) {
                            journal.permission = { default: CONST.ENTITY_PERMISSIONS.OBSERVER };
                        }
                        return journal;
                    }
                }
            }
        })
    );

    compData = compData.filter(Boolean); // apparently some items can still be undefined at this point

    if (oldIds.length) {
        let updates = compData
            .sort((a, b) => a["flags.azgaar-foundry.i"] - b["flags.azgaar-foundry.i"])
            .map((cJournal, index) => {
                cJournal._id = oldIds[index];
                return cJournal;
            });
        await JournalEntry.updateDocuments(updates, { pack: "world." + compType });
    } else {
        await JournalEntry.createDocuments(compData, { pack: "world." + compType });
    }

    return comp;
}

Hooks.once("init", () => {
    game.settings.registerMenu("azgaar-foundry", "config", {
        name: "Load Map",
        label: "Load Azgaar's Map into Foundry",
        hint: "Load Azgaar's Map into Foundry",
        icon: "fas fa-desktop",
        type: LoadAzgaarMap,
        restricted: true,
    });
});

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(
        "azgaar-foundry",
        "Note.prototype._onClickLeft2",
        async function (wrapped, ...args) {
            const cJournal = this.document.getFlag("azgaar-foundry", "journal");
            const cPerm = this.document.getFlag("azgaar-foundry", "permission");
            // Technically all of our MapNotes are the default "Azgaar FMG"
            // JournalEntry, so here we check the permissions on the "real"
            // JournalEntry. As a default just let the GM through though.
            if (cJournal && (cPerm?.default >= 1 || game.user.isGM)) {
                const comp = game.packs.get(cJournal.compendium);
                let doc = await comp.getDocument(cJournal.journal);
                doc.sheet.render(true);
            } else {
                return wrapped(...args);
            }
        },
        "MIXED"
    );
});
