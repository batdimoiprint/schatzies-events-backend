import { randomUUID } from 'crypto';
import {
  createPackage as createPackageService,
  getPackages as getPackagesService,
  getPackageById as getPackageByIdService,
  updatePackage as updatePackageService,
  deletePackage as deletePackageService,
  addPackagePax as addPackagePaxService,
  updatePackagePax as updatePackagePaxService,
  deletePackagePax as deletePackagePaxService,
  addPackageInclusion as addPackageInclusionService,
  updatePackageInclusion as updatePackageInclusionService,
  deletePackageInclusion as deletePackageInclusionService,
} from '../services/package.service.js';
import {
  uploadFile,
  generateUniqueFileName,
} from '../services/s3.service.js';

async function handleImageUploads(files, packageId) {
  if (!files || files.length === 0) return null;
  const uploads = await Promise.all(
    files.map((file) => {
      const key = generateUniqueFileName(file.originalname, `packages/${packageId}`);
      return uploadFile(file.buffer, key, file.mimetype).then((result) => ({
        key: result.key,
        url: result.location,
      }));
    })
  );
  return uploads;
}

// ---- Package ----

export async function createPackage(req, res) {
  try {
    const payload = req.body ?? {};
    const packageId = randomUUID();
    const images = await handleImageUploads(req.files, packageId);
    const pkg = await createPackageService({ ...payload, id: packageId }, images ?? []);
    return res.status(201).json({ message: 'Package created successfully', package: pkg });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create package';
    return res.status(400).json({ error: message });
  }
}

export async function getPackages(req, res) {
  try {
    const { eventType } = req.query;
    const packages = await getPackagesService(eventType || null);
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
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    return res.status(200).json({ package: pkg });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch package';
    return res.status(500).json({ error: message });
  }
}

export async function updatePackage(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};
    const images = req.files?.length ? await handleImageUploads(req.files, id) : null;
    let existingImages = null;
    if (payload.existingImages) {
      try {
        existingImages = JSON.parse(payload.existingImages);
      } catch (e) {
        existingImages = null;
      }
    }
    const pkg = await updatePackageService(id, payload, images, existingImages);
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
    await deletePackageService(id);
    return res.status(200).json({ message: 'Package deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Package not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete package';
    return res.status(500).json({ error: message });
  }
}

// ---- Pax ----

export async function addPackagePax(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};
    const pax = await addPackagePaxService(id, payload);
    return res.status(201).json({ message: 'Pax added successfully', pax });
  } catch (error) {
    if (error instanceof Error && error.message === 'Package not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to add pax';
    return res.status(400).json({ error: message });
  }
}

export async function updatePackagePax(req, res) {
  try {
    const { id, paxId } = req.params;
    const payload = req.body ?? {};
    const pax = await updatePackagePaxService(id, paxId, payload);
    return res.status(200).json({ message: 'Pax updated successfully', pax });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Package not found', 'Pax not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to update pax';
    return res.status(400).json({ error: message });
  }
}

export async function deletePackagePax(req, res) {
  try {
    const { id, paxId } = req.params;
    await deletePackagePaxService(id, paxId);
    return res.status(200).json({ message: 'Pax deleted successfully' });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Package not found', 'Pax not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete pax';
    return res.status(500).json({ error: message });
  }
}

// ---- Inclusions ----

export async function addPackageInclusion(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};
    const inclusion = await addPackageInclusionService(id, payload);
    return res
      .status(201)
      .json({ message: 'Inclusion added successfully', inclusion });
  } catch (error) {
    if (error instanceof Error && error.message === 'Package not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to add inclusion';
    return res.status(400).json({ error: message });
  }
}

export async function updatePackageInclusion(req, res) {
  try {
    const { id, inclusionId } = req.params;
    const payload = req.body ?? {};
    const inclusion = await updatePackageInclusionService(id, inclusionId, payload);
    return res
      .status(200)
      .json({ message: 'Inclusion updated successfully', inclusion });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Package not found', 'Inclusion not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to update inclusion';
    return res.status(400).json({ error: message });
  }
}

export async function deletePackageInclusion(req, res) {
  try {
    const { id, inclusionId } = req.params;
    await deletePackageInclusionService(id, inclusionId);
    return res.status(200).json({ message: 'Inclusion deleted successfully' });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Package not found', 'Inclusion not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete inclusion';
    return res.status(500).json({ error: message });
  }
}
