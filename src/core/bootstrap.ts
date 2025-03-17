import * as https from 'https';

interface CssClass {
  className: string;
  classProperties: string;
}

const extractCssClasses = (css: string): CssClass[] => {
  try {
    const classRegex = /\.([a-zA-Z0-9\-_]+)([^{]*?)\s*{([^}]*)}/gs;
    const classes: CssClass[] = [];
    const uniqueClasses = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = classRegex.exec(css))) {
      const className = match[1];
      let classProperties = match[0];

      classProperties = classProperties
        .replace(/\s*{\s*/, ' {\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\s*}\s*$/, '\n}');

      if (!uniqueClasses.has(className)) {
        uniqueClasses.add(className);
        classes.push({
          className: className,
          classProperties: classProperties,
        });
      }
    }

    return classes;
  } catch (error) {
    return [];
  }
};

const fetchBootstrapCss = async (version: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = `https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/css/bootstrap.css`;

    const request = https.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        const error = `HTTP Error: ${res.statusCode}`;
        reject(new Error(error));
        return;
      }

      const contentType = res.headers['content-type'];
      if (!contentType || !contentType.includes('text/css')) {
        reject(new Error('Invalid content type'));
        return;
      }

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (!data) {
          reject(new Error('Empty response'));
          return;
        }
        resolve(data);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

export const getClasses = async (version: string): Promise<CssClass[]> => {
  try {
    const rawCss = await fetchBootstrapCss(version);

    if (!rawCss) {
      return [];
    }

    const classes = extractCssClasses(rawCss);
    return classes;
  } catch (error) {
    return [];
  }
};
