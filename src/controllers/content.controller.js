import {
  getPageContents as getPageContentsService,
  updateSectionContent as updateSectionContentService,
} from '../services/content.service.js';

export async function getPageContents(req, res) {
  try {
    const { pageId } = req.params;
    const contents = await getPageContentsService(pageId);
    return res.status(200).json(contents);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch page contents';
    return res.status(500).json({ error: message });
  }
}

export async function updateSectionContent(req, res) {
  try {
    const { pageId, sectionId } = req.params;
    const { title, body } = req.body;
    const content = await updateSectionContentService(pageId, sectionId, { title, body });
    return res.status(200).json(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update section content';
    return res.status(500).json({ error: message });
  }
}
