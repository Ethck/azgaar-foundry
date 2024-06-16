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
            height: 800,
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

    updateMapSize(w, h) {
        this.element[0].querySelector(".azgaar-foundry #mapsize #mapw").value = w;
        this.element[0].querySelector(".azgaar-foundry #mapsize #maph").value = h;
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
        let json = JSON.parse(text);
        console.log(json);
        /* Data format as presented in v1.97 of Azgaar's Fantasy Map Generator
            {
                biomesData: {},
                grid: {},
                info: {
                    seed
                },
                mapCoordinates: {},
                nameBases: {},
                notes: [], #notes about generated militaries and markers (no coordinates)
                pack: {
                    burgs: [],
                    cells: [],
                    cultures: [],
                    features: [],
                    markers: [],
                    provinces: [],
                    religions: [],
                    rivers: [],
                    states: [],
                    vertices: []
                },
                settings: {
                    mapName,
                    mapSize,
                    populationRate,
                    urbanDensity,
                    urbanization
                }
            }
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

        this.provinces = json.pack.provinces;
        this.burgs = json.pack.burgs;
        this.countries = json.pack.states;
        this.religions = json.pack.religions;
        this.cultures = json.pack.cultures;
        this.rivers = json.pack.rivers;
        this.settings = json.settings;
        this.seed = json.info.seed;
        this.pack = json.pack;
        this.notes = json.notes;
        this.cells = json.pack.cells;
        this.markers = json.pack.markers;

        // Required for burg map link generation
        this.cells.r = this.cells.map((cell) => cell.r);
        this.cells.haven = this.cells.map((cell) => cell.haven);
        this.cells.p = this.cells.map((cell) => cell.p);
        this.cells.biome = this.cells.map((cell) => cell.biome);
        this.cells.road = this.cells.map((cell) => cell.road);

        this.countries.map((country) => {
            country.relationships = [];
            country.diplomacy.forEach((state, i) => {
                if (state === "x") return;
                country.relationships.push({
                    refCountry: this.countries[i].fullName,
                    status: state,
                });
            });

            return country;
        });

        this.markers.map((marker) => {
            const mapNotes = json.notes.filter((note) => note.id === "marker" + marker.i)[0];
            marker.name = mapNotes.name;
            marker.legend = this.sanitizeLegend(mapNotes.legend);

            return marker;
        });

        console.log(this.markers);
        // Used to scale the picture later, might be wrong if map file is from different
        // computer, or it was fullscreen vs not or OS level zoom, etc.
        this.mapWidth = window.innerWidth;
        this.mapHeight = window.innerHeight;

        // Update our default values to what we know the current screen is as a best guess
        this.updateMapSize(this.mapWidth, this.mapHeight);
    }

    /**
     * This method takes the data from memory and creates readable Journal
     * Entries out of it.
     *
     * @return {Promise}    resolve once all Foundry creations are done.
     */
    async importData(azgaarFolder) {
        return new Promise(async (resolve, reject) => {
            /**
             * Cultures
             */
            let religionLookup = [];
            if (this.religions) {
                ui.notifications.notify("UAFMGI: Creating Journals for Religions");
                this.religionComp = await compendiumUpdater(
                    "Religions",
                    "religion.hbs",
                    this.religions,
                    {},
                    azgaarFolder
                );
                religionLookup = this.religions.map((religion) => {
                    if (!(jQuery.isEmptyObject(religion) || religion.name === "No religion")) {
                        return {
                            id: religion.i,
                            name: religion.name,
                            culture: religion.culture,
                            journal: this.retrieveJournalByName({ type: "religion", name: religion.name }),
                        };
                    } else {
                        return {};
                    }
                });
            }

            ui.notifications.notify("UAFMGI: Creating Journals for Cultures.");

            const cultureData = this.cultures.map((culture, i) => {
                if (culture !== 0 && !jQuery.isEmptyObject(culture)) {
                    culture.religion = religionLookup.find((rel) => rel.culture === culture.i);
                }
                return culture;
            });

            this.cultureComp = await compendiumUpdater("Cultures", "culture.hbs", cultureData, {}, azgaarFolder);

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
                this.provinceComp = await compendiumUpdater(
                    "Provinces",
                    "province.hbs",
                    this.provinces,
                    {},
                    azgaarFolder
                );
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
                    let culture = cultureLookup[country.culture];
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
            this.countryComp = await compendiumUpdater(
                "Countries",
                "country.hbs",
                renderCountryData,
                {
                    countries: renderCountryData,
                },
                azgaarFolder
            );

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
                    burg.culture = cultureLookup[burg.culture];
                    burg.country = countryLookup[burg.state];
                    burg.province = provinceLookup.find((province) => province.burgs?.includes(burg.i));
                    burg.burgURL = this.createMfcgLink(burg);
                }
                return burg;
            });

            this.burgComp = await compendiumUpdater("Burgs", "burg.hbs", burgData, {}, azgaarFolder);

            const burgLookup = this.burgs.map((burg, i) => {
                return {
                    id: burg.i,
                    name: burg.name,
                    journal: this.retrieveJournalByName({ type: "burg", name: burg.name }),
                };
            });

            /**
             * Markers
             */
            ui.notifications.notify("UAFMGI: Creating Journals for Markers.");
            if (this.markers) {
                ui.notifications.notify("UAFMGI: Creating Journals for Markers.");
                const markerData = this.markers;
                this.markerComp = await compendiumUpdater("Markers", "marker.hbs", markerData, {}, azgaarFolder);
                const markerLookup = this.markers.map((marker) => {
                    return {
                        id: marker.i,
                        name: marker.name,
                        icon: marker.icon,
                        type: marker.type,
                        journal: this.retrieveJournalByName({ type: "marker", name: marker.name }),
                    };
                });
            }

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
                this.provinceComp = await compendiumUpdater(
                    "Provinces",
                    "province.hbs",
                    provinceData,
                    {},
                    azgaarFolder
                );
            }
            ui.notifications.notify("UAFMGI: Creation Complete.");
            resolve();
        });
    }

    /**
     *
     * @param {string} suspectHTML Legend text from Full Export file, often littered with HTML fragments
     * @returns Clean version of string with "bad" HTML removed.
     */

    sanitizeLegend(suspectHTML) {
        // The legend will sometimes have iframes in it, notably for One Page Dungeons or Random Encounters
        // This will strip the iframe (it would be lost on reload by the Foundry Server anyways)
        // and save a "clean" version that will maintain the link.
        const regex = /\n*\s*<iframe.*?\\?>.*?<\/iframe\\?>\s*\n*/gi;
        let cleanString = suspectHTML.replace(regex, "");
        if (suspectHTML.includes("You have encountered a character.")) {
            // Create a fake wrapper element so we can grab the link without resorting to more regex
            const i = document.createElement("div");
            i.innerHTML = suspectHTML;
            const link = i.querySelector("iframe")?.src;
            // Make a non iframe version of the link by replacing the word character with the link
            cleanString = '<div>You have encountered a <a href="' + link + '">character.</a></div>';
        }
        return cleanString;
    }

    /**
     * Make a new scene with the picture as the background
     *
     * @param  {string} picture    File path to the picture asset
     * @return {Scene}         New Scene to work on
     */
    async makeScene(picture, mapW, mapH) {
        return new Promise(async (resolve, reject) => {
            let sceneName = picture.split("%20")[0].split(".(svg|png|jpg|jpeg|webm)")[0];

            // Defaulted to window.innerWidth and window.innerHeight
            // but sometimes it's different so accept the new val
            const ogWidth = parseInt(mapW);
            const ogHeight = parseInt(mapH);

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
                "background.src": picture,
                tokenVision: false,
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
        } else if (type === "religion") {
            searchable = this.religionComp;
        } else if (type === "marker") {
            searchable = this.markerComp;
        }

        let journal = searchable.find((elem) => elem.name === name);

        return journal;
    }

    // TODO: Add Village generator

    createMfcgLink(burg) {
        const cells = this.cells;
        const { i, name, population: burgPopulation, cell } = burg;
        const burgSeed = burg.MFCG || this.seed + String(burg.i).padStart(4, 0);

        const sizeRaw =
            2.13 * Math.pow((burgPopulation * this.settings.populationRate) / this.settings.urbanDensity, 0.385);
        const size = minmax(Math.ceil(sizeRaw), 6, 100);
        const population = rn(burgPopulation * this.settings.populationRate * this.settings.urbanization);

        const river = cells.r[cell] ? 1 : 0;
        const coast = Number(burg.port > 0);
        const sea = (() => {
            if (!coast || !cells.haven[cell]) return null;

            // calculate see direction: 0 = south, 0.5 = west, 1 = north, 1.5 = east
            const p1 = cells.p[cell];
            const p2 = cells.p[cells.haven[cell]];
            let deg = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI - 90;
            if (deg < 0) deg += 360;
            return rn(normalize(deg, 0, 360) * 2, 2);
        })();

        const arableBiomes = river ? [1, 2, 3, 4, 5, 6, 7, 8] : [5, 6, 7, 8];
        const farms = +arableBiomes.includes(cells.biome[cell]);

        const citadel = +burg.citadel;
        const urban_castle = +(citadel && each(2)(i));

        const hub = +cells.road[cell] > 50;

        const walls = +burg.walls;
        const plaza = +burg.plaza;
        const temple = +burg.temple;
        const shantytown = +burg.shanty;

        const url = new URL("https://watabou.github.io/city-generator/");
        url.search = new URLSearchParams({
            name,
            population,
            size,
            seed: burgSeed,
            river,
            coast,
            farms,
            citadel,
            urban_castle,
            hub,
            plaza,
            temple,
            walls,
            shantytown,
            gates: -1,
        });
        if (sea) url.searchParams.append("sea", sea);

        return url.toString();
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

        let azgaarFolder = game.folders.getName("Azgaar FMG");
        if (!azgaarFolder) {
            azgaarFolder = await Folder.create({
                name: "Azgaar FMG",
                type: "Compendium",
                description: "Folder to contain all of the Azgaar FMG compendium objects.",
            });
        }

        // Make the scene
        let picture = this.element.find('[name="pictureMap"]').val();
        if (!picture) {
            ui.notifications.error("[Azgaar FMG] You must attach a picture and a map file to the form.");
            return;
        }
        let mapW = this.element.find(".azgaar-foundry #mapsize #mapw").val();
        let mapH = this.element.find(".azgaar-foundry #mapsize #maph").val();
        let [scene, widthMultiplier, heightMultiplier] = await this.makeScene(picture, mapW, mapH);

        // get icons to use for notes
        const burgSVG = this.element.find("#burgSVG").attr("src");
        const countrySVG = this.element.find("#countrySVG").attr("src");
        const provinceSVG = this.element.find("#provinceSVG").attr("src");

        // get permissions to use
        const burgPerm = parseInt(this.element.find("[name='permissionBurg']:checked").val());
        const countryPerm = parseInt(this.element.find("[name='permissionCountry']:checked").val());
        const provincePerm = parseInt(this.element.find("[name='permissionProvince']:checked").val());
        const markerPerm = parseInt(this.element.find("[name='permissionProvince']:checked").val());

        // import our data
        await this.importData(azgaarFolder);

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
                x: xpole * widthMultiplier || 0,
                y: ypole * heightMultiplier || 0,
                "texture.src": countrySVG,
                iconSize: 32,
                "texture.tint": useColor ? country.color : "#00FF000",
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
                    x: centerBurg.x * widthMultiplier || 0,
                    y: centerBurg.y * heightMultiplier || 0,
                    "texture.src": provinceSVG,
                    iconSize: 32,
                    "texture.tint": useColor ? province.color : "#00FF000",
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
                x: burg.x * widthMultiplier || 0,
                y: burg.y * heightMultiplier || 0,
                "texture.src": burgSVG,
                iconSize: 32,
                "texture.tint": useColor ? burg.color : "#00FF000",
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

        const [markerMinZoom, markerMaxZoom] = this.element
            .find("#azgaar-pin-fixer-select #provinces input")
            .map((i, input) => input.value);

        let markerData = [];
        if (this.markers) {
            markerData = this.markers.map((marker) => {
                let journalEntry = this.retrieveJournalByName({
                    type: "marker",
                    name: marker.name,
                });

                // Assemble data required for notes
                return {
                    entryId: azgaarJournal.id,
                    x: marker.x * widthMultiplier || 0,
                    y: marker.y * heightMultiplier || 0,
                    "texture.src": "/icons/svg/hanging-sign.svg",
                    iconSize: 32,
                    "texture.tint": useColor ? marker.color : "#FFCC99",
                    text: marker.name,
                    fontSize: 24,
                    textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
                    textColor: "#00FFFF",
                    "flags.pinfix.minZoomLevel": markerMinZoom,
                    "flags.pinfix.maxZoomLevel": markerMaxZoom,
                    "flags.azgaar-foundry.journal": { compendium: "world.Markers", journal: journalEntry?.id },
                    "flags.azgaar-foundry.permission": { default: markerPerm },
                };
            });
        }

        // Remove all falsy values.
        countryData = countryData.filter(Boolean);
        provinceData = provinceData.filter(Boolean);
        burgData = burgData.filter(Boolean);

        // Make all of our notes, in one call to the db.
        await canvas.scene.createEmbeddedDocuments("Note", [
            ...countryData,
            ...provinceData,
            ...burgData,
            ...markerData,
        ]);
        return;
    }
}

function minmax(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function rn(v, d = 0) {
    const m = Math.pow(10, d);
    return Math.round(v * m) / m;
}

function normalize(val, min, max) {
    return minmax((val - min) / (max - min), 0, 1);
}

function each(n) {
    return (i) => i % n === 0;
}

async function compendiumUpdater(compType, contentSchema, baseData, extraData, azgaarFolder) {
    // Assumptions for updating
    // 1. Same number of entities (be it is, countries, burgs, whatever)
    // 2. all entities already exist (no new ones!)
    if (!baseData) return;

    let comp;
    let oldIds = [];
    let oldSortedJournals = [];
    if (game.packs.get("world." + compType)) {
        // empty the content
        const oldCComp = game.packs.get("world." + compType);
        const oldCCompContent = await oldCComp.getDocuments();
        oldSortedJournals = oldCCompContent.sort(
            (a, b) => a["flags"]["azgaar-foundry"]["i"] - b["flags"]["azgaar-foundry"]["i"]
        );
        comp = oldCComp;
    } else {
        comp = await CompendiumCollection.createCompendium({ name: compType, label: compType, type: "JournalEntry" });
        await comp.setFolder(azgaarFolder.id);
    }

    // Using data from the map file, create JournalEntry json data for createDocuments
    let compData = await Promise.all(
        baseData.map(async (i) => {
            if (!jQuery.isEmptyObject(i)) {
                if (!(i === 0 && "removed" in i && i.removed === true)) {
                    let content = await renderTemplate("modules/azgaar-foundry/templates/" + contentSchema, {
                        iter: i,
                        extras: extraData,
                    });
                    if (i.name) {
                        let journal = {
                            name: i.name,
                            pages: [
                                {
                                    type: "text",
                                    name: "Overview",
                                    text: { content: content },
                                    "flags.azgaar-foundry.perm": true,
                                },
                            ],
                            "flags.azgaar-foundry.i": i.i,
                        };
                        if (oldIds.length === 0) {
                            journal.permission = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER };
                        }
                        return journal;
                    }
                }
            }
        })
    );

    compData = compData.filter(Boolean); // apparently some items can still be undefined at this point

    // If we have old journals, then we overwrite the module-created pages with the new content dervied from the map file.
    if (oldSortedJournals.length) {
        let journalUpdatePromises = oldSortedJournals.map(async (oldJournal) => {
            const newJournal = compData.find(
                (j) => j["flags.azgaar-foundry.i"] === oldJournal.flags["azgaar-foundry"]["i"]
            );

            const pageUpdates = oldJournal.pages
                .filter((page) => "azgaar-foundry" in page.flags && "perm" in page.flags["azgaar-foundry"])
                .map((page) => {
                    return {
                        _id: page.id,
                        "text.content": newJournal.pages[0].text.content,
                    };
                });

            return await oldJournal.updateEmbeddedDocuments("JournalEntryPage", pageUpdates, {
                pack: "world." + compType,
            });
        });

        await Promise.all(journalUpdatePromises);
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
    if (game.modules.get("monks-enhanced-journal")?.active) {
        libWrapper.ignore_conflicts("azgaar-foundry", "monks-enhanced-journal", "Note.prototype._onClickLeft2");
    }
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

                if (game.modules.get("monks-enhanced-journal")?.active) {
                    game.MonksEnhancedJournal.openJournalEntry(doc);
                } else {
                    doc.sheet.render(true);
                }
            } else {
                return wrapped(...args);
            }
        },
        "MIXED"
    );
});
