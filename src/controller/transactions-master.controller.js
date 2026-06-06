const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.transactionsMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.transactionsMaster.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.transactionsMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.transactionsMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.transactionsMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const downloadReport = asyncHandler(async (req, res) => {
  const { buffer, filename } = await usecase.transactionsMaster.downloadReport(
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
