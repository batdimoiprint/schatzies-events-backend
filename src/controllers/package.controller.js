import {
  createPackage as createPackageService,
  getPackages as getPackagesService,
  getPackageById as getPackageByIdService,
  updatePackage as updatePackageService,
  deletePackage as deletePackageService,
} from '../services/package.service.js';
import {
  uploadFile,
  deleteFile,
  generateUniqueFileName,
} from '../services/s3.service.js';

function parseJsonField(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export async function createPackage(req, res) {
  try {
    const body = req.body ?? {};

    let imageUrl = '';
    let imageKey = '';
    if (req.file) {
      const key = generateUniqueFileName(req.file.originalname, 'packages');
      const result = await uploadFile(req.file.buffer, key, req.file.mimetype);
      imageUrl = result.location || '';
      imageKey = key;
    }

    const pkg = await createPackageService({
      eventType: body.eventType,
      packageName: body.packageName,
      description: body.description,
      inclusions: parseJsonField(body.inclusions, []),
      paxOptions: parseJsonField(body.paxOptions, []),
      note: body.note,
      imageUrl,
      imageKey,
    });

    return res.status(201).json({ message: 'Package created successfully', package: pkg });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create package';
    return res.status(400).json({ error: message });
  }
}

export async function getPackages(req, res) {
  try {
    const { eventType } = req.query;
    const packages = await getPackagesService(eventType);
    return res.status(200).json({ packages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch packages';
    return res.status(500).json({ error: message });
  }
}

export async function getPackageById(req, res) {
  try {
    const { id } = req.params;
    const pkg = await getPackageByIdService(id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    return res.status(200).json({ package: pkg });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch package';
    return res.status(500).json({ error: message });
  }
}

export async function updatePackage(req, res) {
  try {
    const { id } = req.params;
    const body = req.body ?? {};

    const updateData = {};
    if (body.eventType !== undefined) updateData.eventType = body.eventType;
    if (body.packageName !== undefined) updateData.packageName = body.packageName;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.note !== undefined) updateData.note = body.note;
    if (body.inclusions !== undefined) updateData.inclusions = parseJsonField(body.inclusions, []);
    if (body.paxOptions !== undefined) updateData.paxOptions = parseJsonField(body.paxOptions, []);

    let oldImageKey;
    if (req.file) {
      const existing = await getPackageByIdService(id);
      if (!existing) return res.status(404).json({ error: 'Package not found' });
      oldImageKey = existing.imageKey;

      const key = generateUniqueFileName(req.file.originalname, 'packages');
      const result = await uploadFile(req.file.buffer, key, req.file.mimetype);
      updateData.imageUrl = result.location || '';
      updateData.imageKey = key;
    }

    const pkg = await updatePackageService(id, updateData);

    if (oldImageKey) {
      await deleteFile(oldImageKey).catch(() => {});
    }

    return res.status(200).json({ message: 'Package updated successfully', package: pkg });
  } catch (error) {
    if (error instanceof Error && error.message === 'Package not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to update package';
    return res.status(400).json({ error: message });
  }
}

export async function deletePackage(req, res) {
  try {
    const { id } = req.params;
    const deleted = await deletePackageService(id);

    if (deleted.imageKey) {
      await deleteFile(deleted.imageKey).catch(() => {});
    }

    return res.status(200).json({ message: 'Package deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Package not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete package';
    return res.status(500).json({ error: message });
  }
}
