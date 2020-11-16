# lynx-pdf
Module for the lynx framework to enable the creation of PDF files.

Requires `lynx-framework@1.1.10` or later versions.


## Usage

The module defines static method to generates PDFs.

It is possible to generate a `Media` entity (preferred method):

```
let media = await PdfModule.generateMediaFromTemplate('templates/pdf/example', context, {}, req.user, pdfDirectory);
```

or a temporary file:

```
let path = await PdfModule.generateFromTemplate('templates/pdf/example', context);
```