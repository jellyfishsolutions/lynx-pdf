import SimpleModule from "lynx-framework/simple.module";
import * as puppeteer from "puppeteer";
import * as fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import { app } from "lynx-framework/app";
import Media from "lynx-framework/entities/media.entity";
import User from "lynx-framework/entities/user.entity";

function compileTemplate(template: string, context: any): Promise<any> {
    return new Promise((res, rej) => {
        app.nunjucksEnvironment.render(template, context, (err, v) => {
            if (err) {
                return rej(err);
            }
            res(v);
        });
    });
}

function createFile(path: string, text: string): Promise<void> {
    return new Promise((res, rej) => {
        fs.writeFile(path, text, err => {
            if (err) {
                return rej(err);
            }
            return res();
        });
    });
}

function deleteFile(path: string): Promise<void> {
    return new Promise((res, rej) => {
        fs.unlink(path, err => {
            if (err) {
                return rej(err);
            }
            return res();
        });
    });
}

function safeMakeDir(path: string): Promise<void> {
    return new Promise((res, rej) => {
        fs.exists(path, exsists => {
            if (exsists) {
                return res();
            }
            fs.mkdir(path, err => {
                if (err) {
                    return rej(err);
                }
                return res();
            });
        });
    });
}

export default class PdfModule extends SimpleModule {
    static OUTPUT_FOLDER = __dirname + "/pdf/";
    static TMP_FOLDER = __dirname + "/tmp/";

    /**
     * Set the output folder for generated pdf
     * @param path the new path
     */
    static setOutputFolder(path: string) {
        this.OUTPUT_FOLDER = path;
    }

    /**
     * Low level method to generate a PDF from a generic file.
     * Probably, you should use the @method generateFromTemplate method.
     * It is just a wraps the puppeteer API.
     * If not specified in the options, the default output file will be an A4 sheet.
     * @param from source file
     * @param to destination file
     * @param options any options needed by the puppeteer lib.
     */
    static async generate(from: string, to: string, options: any = {}) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(from);

        if (!options.path) {
            options.path = to;
        }
        if (!options.format) {
            options.format = "A4";
        }

        await page.pdf(options);
        await browser.close();
    }

    /**
     * Generate a PDF file starting from a nunjucks template and a context.
     * Its your responsability to remove or move the generated pdf.
     * @param from the path of the chosen template
     * @param context the context to be used to render the chosen template
     * @param options any options to used by the puppetter library to render the pdf
     * @return the path of the generated pdf.
     */
    static async generateFromTemplate(
        from: string,
        context: any = {},
        options: any = {}
    ): Promise<string> {
        await Promise.all([
            safeMakeDir(PdfModule.TMP_FOLDER),
            safeMakeDir(PdfModule.OUTPUT_FOLDER)
        ]);

        let generatedHtml = PdfModule.TMP_FOLDER + uuidv4() + ".html";

        if (!from.endsWith(".njk")) {
            from += ".njk";
        }
        let output = await compileTemplate(from, context);
        await createFile(generatedHtml, output);

        let generatedPdf = PdfModule.OUTPUT_FOLDER + uuidv4() + ".pdf";
        await PdfModule.generate(
            "file://" + generatedHtml,
            generatedPdf,
            options
        );
        deleteFile(generatedHtml);
        return generatedPdf;
    }

    /**
     * Generate a PDF file starting from a nunjuks template and a context.
     * Finally, a new Media will be created starting from the generated PDF. 
     * @param from the path of the chosen template
     * @param context the context to be used to render the chosen template
     * @param options any options to used by the puppetter library to render the pdf
     * @param user the optional user performing the request (aka the file owner)
     * @param directory the optional virtual directory; defaults to '/' (root)
     * @return the new created media
     */
    static async generateMediaFromTemplate(from: string, context: any = {}, options: any = {}, user?: User, directory?: Media): Promise<Media> {

            await safeMakeDir(PdfModule.TMP_FOLDER);
    
            let generatedHtml = PdfModule.TMP_FOLDER + uuidv4() + ".html";
    
            if (!from.endsWith(".njk")) {
                from += ".njk";
            }
            let output = await compileTemplate(from, context);
            await createFile(generatedHtml, output);
    
            let name = uuidv4() + ".pdf";
            let generatedPdf = PdfModule.TMP_FOLDER + name;
            await PdfModule.generate(
                "file://" + generatedHtml,
                generatedPdf,
                options
            );
            deleteFile(generatedHtml);

            return Media.persistTempFile(name, generatedPdf, user as any, directory)
        }
}
