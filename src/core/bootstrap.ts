import * as vscode from 'vscode';
import * as https from 'https';
import { Logger, LogLevel } from './logger';

interface CssClass {
  className: string;
  classProperties: string;
}

const logger = Logger.getInstance();

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
    logger.log(LogLevel.ERROR, 'Error extracting CSS classes', error as Error);
    return [];
  }
};

const fetchBootstrapCss = async (version: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = `https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/css/bootstrap.css`;
    logger.log(LogLevel.INFO, 'Fetching Bootstrap CSS', { url });

    const request = https.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        const error = `HTTP Error: ${res.statusCode}`;
        logger.log(LogLevel.ERROR, error);
        reject(new Error(error));
        return;
      }

      const contentType = res.headers['content-type'];
      if (!contentType || !contentType.includes('text/css')) {
        const error = `Invalid content type: ${contentType}`;
        logger.log(LogLevel.ERROR, error);
        reject(new Error('Invalid content type'));
        return;
      }

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (!data) {
          logger.log(LogLevel.ERROR, 'Empty response received');
          reject(new Error('Empty response'));
          return;
        }
        logger.log(LogLevel.INFO, 'Bootstrap CSS successfully fetched');
        resolve(data);
      });
    });

    request.on('error', (error) => {
      logger.log(LogLevel.ERROR, 'Network error fetching CSS', error as Error);
      reject(error);
    });

    request.on('timeout', () => {
      logger.log(LogLevel.ERROR, 'Request timeout fetching CSS');
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

export const getClasses = async (version: string): Promise<CssClass[]> => {
  try {
    logger.log(LogLevel.INFO, 'Loading Bootstrap classes', { version });
    const rawCss = await fetchBootstrapCss(version);

    if (!rawCss) {
      logger.log(LogLevel.ERROR, 'No CSS content received');
      return [];
    }

    const classes = extractCssClasses(rawCss);
    logger.log(LogLevel.INFO, 'Bootstrap classes loaded', { count: classes.length });
    return classes;
  } catch (error) {
    logger.log(LogLevel.ERROR, 'Error loading Bootstrap classes', error as Error);
    return [];
  }
};
