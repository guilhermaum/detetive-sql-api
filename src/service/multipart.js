const maximumBodySize = 10 * 1024 * 1024;

function multipartError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function parseBoundary(contentType) {
  const match = contentType.match(/(?:^|;)\s*boundary=(?:"([^"]+)"|([^;\s]+))/i);
  return match?.[1] ?? match?.[2] ?? null;
}

function dispositionParameter(value, name) {
  const match = value.match(new RegExp(`(?:^|;)\\s*${name}="((?:\\\\.|[^"])*)"`, "i"));
  return match?.[1]?.replace(/\\\\(.)/g, "$1") ?? null;
}

function parseParts(body, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const separator = Buffer.from("\r\n\r\n");
  const nextPart = Buffer.from(`\r\n--${boundary}`);
  const fields = Object.create(null);
  const files = Object.create(null);
  let cursor = body.indexOf(delimiter);

  if (cursor < 0) throw multipartError("Invalid multipart/form-data body.");

  while (cursor >= 0) {
    cursor += delimiter.length;
    if (body.subarray(cursor, cursor + 2).toString() === "--") break;
    if (body.subarray(cursor, cursor + 2).toString() !== "\r\n") {
      throw multipartError("Invalid multipart/form-data body.");
    }
    cursor += 2;

    const headersEnd = body.indexOf(separator, cursor);
    if (headersEnd < 0) throw multipartError("Invalid multipart/form-data body.");
    const headers = body.subarray(cursor, headersEnd).toString("latin1");
    const disposition = headers.match(/^content-disposition:\s*form-data\s*;([^\r\n]+)$/im)?.[1];
    const fieldName = disposition && dispositionParameter(`;${disposition}`, "name");
    if (!fieldName) throw multipartError("Invalid multipart/form-data body.");

    const dataStart = headersEnd + separator.length;
    const dataEnd = body.indexOf(nextPart, dataStart);
    if (dataEnd < 0) throw multipartError("Invalid multipart/form-data body.");
    const data = body.subarray(dataStart, dataEnd);
    const filename = dispositionParameter(`;${disposition}`, "filename");
    const contentType = headers.match(/^content-type:\s*([^\r\n]+)/im)?.[1]?.trim() ?? "application/octet-stream";

    if (filename !== null) {
      if (!["database_file", "database_image"].includes(fieldName)) {
        throw multipartError("Accepted file fields are 'database_file' and 'database_image'.");
      }
      if (filename && Object.hasOwn(files, fieldName)) {
        throw multipartError(`Send only one file in the '${fieldName}' field.`);
      }
      if (filename) files[fieldName] = { filename, data, contentType };
    } else {
      if (Object.hasOwn(fields, fieldName)) {
        throw multipartError(`The '${fieldName}' field was sent more than once.`);
      }
      fields[fieldName] = data.toString("utf8");
    }

    cursor = dataEnd + 2;
  }

  return { fields, files };
}

export async function parseMultipartForm(req) {
  const contentType = req.headers["content-type"] ?? "";
  if (!/^multipart\/form-data\b/i.test(contentType)) {
    throw multipartError("Send the form as multipart/form-data.", 415);
  }

  const boundary = parseBoundary(contentType);
  if (!boundary || boundary.length > 200) {
    throw multipartError("Missing or invalid multipart/form-data boundary.");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maximumBodySize) {
      throw multipartError("The form exceeds the 10 MB limit.", 413);
    }
    chunks.push(chunk);
  }

  return parseParts(Buffer.concat(chunks, size), boundary);
}
