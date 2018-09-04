import SimpleModule from "lynx-framework/simple.module";
import * as puppeteer from "puppeteer";
import * as fs from "fs";
import uuid from "uuid/v4";
import { app } from "lynx-framework/app";

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

export default class PdfModule extends SimpleModule {
    static OUTPUT_FOLDER = __dirname + "/pdf/";
    static TMP_FOLDER = __dirname + "/tmp/";

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
        let generatedHtml = PdfModule.TMP_FOLDER + uuid() + ".html";

        if (!from.endsWith(".njk")) {
            from += ".njk";
        }
        let output = await compileTemplate(from, context);
        await createFile(generatedHtml, output);

        let generatedPdf = PdfModule.OUTPUT_FOLDER + uuid() + ".pdf";
        await PdfModule.generate(
            "file://" + generatedHtml,
            generatedPdf,
            options
        );
        deleteFile(generatedHtml);
        return generatedPdf;
    }
}
