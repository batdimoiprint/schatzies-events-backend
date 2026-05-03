import Joi from 'joi';

export const confirmEventSchema = Joi.object({
  event_date: Joi.string().isoDate().required(),
  venue: Joi.string().trim().required(),
  notes: Joi.string().trim().allow('').optional(),
});

export const allocationSchema = Joi.object({
  vendors: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().required(),
        name: Joi.string().trim().required(),
      })
    )
    .optional(),
  manpower: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().required(),
        role: Joi.string().trim().required(),
      })
    )
    .optional(),
  supplies: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().required(),
        item: Joi.string().trim().required(),
        quantity: Joi.number().integer().min(0).optional(),
      })
    )
    .optional(),
  decorations: Joi.object({
    theme: Joi.string().trim().optional().allow(''),
    materials: Joi.array().items(Joi.string().trim()).optional(),
  }).optional(),
  flow_type: Joi.string().trim().optional().allow(''),
  food_package: Joi.string().trim().optional().allow(''),
});

export const precheckSchema = Joi.object({
  venue_secured: Joi.boolean().required(),
  vendors_ready: Joi.boolean().required(),
  manpower_ready: Joi.boolean().required(),
  supplies_ready: Joi.boolean().required(),
  remarks: Joi.string().trim().allow('').optional(),
});

export const programFlowSchema = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().trim().allow('').optional(),
  start_time: Joi.string().isoDate().required(),
  end_time: Joi.string().isoDate().required(),
});

export const updateProgramFlowSchema = Joi.object({
  title: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('').optional(),
  start_time: Joi.string().isoDate().optional(),
  end_time: Joi.string().isoDate().optional(),
}).min(1);

export const timelineTaskSchema = Joi.object({
  task_name: Joi.string().trim().required(),
  scheduled_time: Joi.string().isoDate().required(),
  is_completed: Joi.boolean().optional(),
});

export const updateTimelineTaskSchema = Joi.object({
  task_name: Joi.string().trim().optional(),
  scheduled_time: Joi.string().isoDate().optional(),
  is_completed: Joi.boolean().optional(),
}).min(1);

export const taskSchema = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().trim().allow('').optional(),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('').optional(),
}).min(1);

export const moveTaskSchema = Joi.object({
  newStatus: Joi.string().valid('TODO', 'IN_PROGRESS', 'COMPLETED').required(),
  newOrder: Joi.number().integer().min(1).required(),
});

export const notesSchema = Joi.object({
  notes: Joi.alternatives()
    .try(Joi.string().trim().allow(''), Joi.object())
    .required(),
});

export const checklistSchema = Joi.object({
  checklist: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().required(),
        label: Joi.string().trim().required(),
        done: Joi.boolean().required(),
      })
    )
    .required(),
});

export const patchChecklistSchema = Joi.object({
  checklist: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().required(),
        label: Joi.string().trim().optional(),
        done: Joi.boolean().required(),
      })
    )
    .required(),
});

export const eventStatusSchema = Joi.object({
  status: Joi.string().valid('PLANNING', 'EXECUTION', 'COMPLETED').required(),
});

export const resourceStatusSchema = Joi.object({
  assignee_type: Joi.string().valid('vendor', 'manpower').required(),
  assignee_id: Joi.string().trim().required(),
  assignee_name: Joi.string().trim().required(),
  status: Joi.string().valid('pending', 'onsite', 'late').required(),
});

export const updateResourceStatusSchema = Joi.object({
  assignee_type: Joi.string().valid('vendor', 'manpower').optional(),
  assignee_id: Joi.string().trim().optional(),
  assignee_name: Joi.string().trim().optional(),
  status: Joi.string().valid('pending', 'onsite', 'late').optional(),
}).min(1);
