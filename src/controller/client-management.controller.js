const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.clientManagement.list(
    buildListPayload(req.body)
  );
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.clientManagement.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.clientManagement.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.clientManagement.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.clientManagement.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const downloadReport = asyncHandler(async (req, res) => {
  const { buffer, filename } = await usecase.clientManagement.downloadReport(
    req.body
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );
  res.send(Buffer.from(buffer));
});

module.exports = { list, getById, create, update, remove, downloadReport };
