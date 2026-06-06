const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.plansTracker.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getPlan = asyncHandler(async (req, res) => {
  const result = await usecase.plansTracker.getPlan(req.body);
  res.status(result.statusCode).json(result);
});

const downloadReport = asyncHandler(async (req, res) => {
  const { buffer, filename } = await usecase.plansTracker.downloadReport(req.body);
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

module.exports = { list, getPlan, downloadReport };
