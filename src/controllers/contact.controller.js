import {
  createContact as createContactService,
  getContacts as getContactsService,
  getContactById as getContactByIdService,
  updateContact as updateContactService,
  deleteContact as deleteContactService,
  addAddress as addAddressService,
  updateAddress as updateAddressService,
  deleteAddress as deleteAddressService,
  addPhone as addPhoneService,
  updatePhone as updatePhoneService,
  deletePhone as deletePhoneService,
  addLink as addLinkService,
  updateLink as updateLinkService,
  deleteLink as deleteLinkService,
  addEmail as addEmailService,
  updateEmail as updateEmailService,
  deleteEmail as deleteEmailService,
} from '../services/contact.service.js';

// ---- Contact ----

export async function createContact(req, res) {
  try {
    const contact = await createContactService(req.body ?? {});
    return res.status(201).json({ message: 'Contact created successfully', contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create contact';
    return res.status(400).json({ error: message });
  }
}

export async function getContacts(req, res) {
  try {
    const contacts = await getContactsService();
    return res.status(200).json({ contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch contacts';
    return res.status(500).json({ error: message });
  }
}

export async function getContactById(req, res) {
  try {
    const { id } = req.params;
    const contact = await getContactByIdService(id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    return res.status(200).json({ contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch contact';
    return res.status(500).json({ error: message });
  }
}

export async function updateContact(req, res) {
  try {
    const { id } = req.params;
    const contact = await updateContactService(id, req.body ?? {});
    return res.status(200).json({ message: 'Contact updated successfully', contact });
  } catch (error) {
    if (error instanceof Error && error.message === 'Contact not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to update contact';
    return res.status(400).json({ error: message });
  }
}

export async function deleteContact(req, res) {
  try {
    const { id } = req.params;
    await deleteContactService(id);
    return res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Contact not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete contact';
    return res.status(500).json({ error: message });
  }
}

// ---- Address ----

export async function addAddress(req, res) {
  try {
    const { id } = req.params;
    const address = await addAddressService(id, req.body ?? {});
    return res.status(201).json({ message: 'Address added successfully', address });
  } catch (error) {
    if (error instanceof Error && error.message === 'Contact not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to add address';
    return res.status(400).json({ error: message });
  }
}

export async function updateAddress(req, res) {
  try {
    const { id, addressId } = req.params;
    const address = await updateAddressService(id, addressId, req.body ?? {});
    return res.status(200).json({ message: 'Address updated successfully', address });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Contact not found', 'Address not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to update address';
    return res.status(400).json({ error: message });
  }
}

export async function deleteAddress(req, res) {
  try {
    const { id, addressId } = req.params;
    await deleteAddressService(id, addressId);
    return res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Contact not found', 'Address not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete address';
    return res.status(500).json({ error: message });
  }
}

// ---- Phone ----

export async function addPhone(req, res) {
  try {
    const { id } = req.params;
    const phone = await addPhoneService(id, req.body ?? {});
    return res.status(201).json({ message: 'Phone number added successfully', phone });
  } catch (error) {
    if (error instanceof Error && error.message === 'Contact not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to add phone number';
    return res.status(400).json({ error: message });
  }
}

export async function updatePhone(req, res) {
  try {
    const { id, phoneId } = req.params;
    const phone = await updatePhoneService(id, phoneId, req.body ?? {});
    return res.status(200).json({ message: 'Phone number updated successfully', phone });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Contact not found', 'Phone not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to update phone number';
    return res.status(400).json({ error: message });
  }
}

export async function deletePhone(req, res) {
  try {
    const { id, phoneId } = req.params;
    await deletePhoneService(id, phoneId);
    return res.status(200).json({ message: 'Phone number deleted successfully' });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Contact not found', 'Phone not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete phone number';
    return res.status(500).json({ error: message });
  }
}

// ---- Link ----

export async function addLink(req, res) {
  try {
    const { id } = req.params;
    const link = await addLinkService(id, req.body ?? {});
    return res.status(201).json({ message: 'Link added successfully', link });
  } catch (error) {
    if (error instanceof Error && error.message === 'Contact not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to add link';
    return res.status(400).json({ error: message });
  }
}

export async function updateLink(req, res) {
  try {
    const { id, linkId } = req.params;
    const link = await updateLinkService(id, linkId, req.body ?? {});
    return res.status(200).json({ message: 'Link updated successfully', link });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Contact not found', 'Link not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to update link';
    return res.status(400).json({ error: message });
  }
}

export async function deleteLink(req, res) {
  try {
    const { id, linkId } = req.params;
    await deleteLinkService(id, linkId);
    return res.status(200).json({ message: 'Link deleted successfully' });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Contact not found', 'Link not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete link';
    return res.status(500).json({ error: message });
  }
}

// ---- Email ----

export async function addEmail(req, res) {
  try {
    const { id } = req.params;
    const email = await addEmailService(id, req.body ?? {});
    return res.status(201).json({ message: 'Email added successfully', email });
  } catch (error) {
    if (error instanceof Error && error.message === 'Contact not found') {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to add email';
    return res.status(400).json({ error: message });
  }
}

export async function updateEmail(req, res) {
  try {
    const { id, emailId } = req.params;
    const email = await updateEmailService(id, emailId, req.body ?? {});
    return res.status(200).json({ message: 'Email updated successfully', email });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Contact not found', 'Email not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to update email';
    return res.status(400).json({ error: message });
  }
}

export async function deleteEmail(req, res) {
  try {
    const { id, emailId } = req.params;
    await deleteEmailService(id, emailId);
    return res.status(200).json({ message: 'Email deleted successfully' });
  } catch (error) {
    if (
      error instanceof Error &&
      ['Contact not found', 'Email not found'].includes(error.message)
    ) {
      return res.status(404).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Unable to delete email';
    return res.status(500).json({ error: message });
  }
}
