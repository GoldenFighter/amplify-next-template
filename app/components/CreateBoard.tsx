"use client";

// TODO: Have boards expire or have a countdown ✅
// TODO: Add a way to delete boards ✅
// TODO: Add a way to edit boards ✅
// TODO: Add a way to view boards ✅
// TODO: Add a way to view submissions ✅
// TODO: Add a way to limit to daily or weekly submissions ✅

import { useState } from "react";
import { client } from "../../lib/client";
import {
  TextField,
  TextAreaField,
  SelectField,
  Button,
  Card,
  Flex,
  Heading,
  SwitchField,
  Input,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

interface CreateBoardProps {
  onBoardCreated: () => void;
  isAdmin: boolean;
  userEmail: string;
}

export default function CreateBoard({ onBoardCreated, isAdmin, userEmail }: CreateBoardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
    maxSubmissionsPerUser: 2,
    allowedEmails: "",
    expiresAt: "",
    submissionFrequency: "unlimited" as "daily" | "weekly" | "monthly" | "unlimited",
    isActive: true,
    contestPrompt: "",
    contestType: "",
    judgingCriteria: "",
    maxScore: 100,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse allowed emails from comma-separated string
      const allowedEmails = formData.allowedEmails
        .split(",")
        .map(email => email.trim())
        .filter(email => email.length > 0);

      // Parse expiration date
      const expiresAt = formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null;

      // Parse judging criteria from comma-separated string
      const judgingCriteria = formData.judgingCriteria
        .split(",")
        .map(criteria => criteria.trim())
        .filter(criteria => criteria.length > 0);

      await client.models.Board.create({
        name: formData.name,
        description: formData.description || null,
        isPublic: formData.isPublic,
        maxSubmissionsPerUser: formData.maxSubmissionsPerUser,
        allowedEmails: allowedEmails.length > 0 ? allowedEmails : null,
        createdBy: userEmail,
        expiresAt,
        isActive: formData.isActive,
        submissionFrequency: formData.submissionFrequency,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: userEmail,
        contestPrompt: formData.contestPrompt || null,
        contestType: formData.contestType || null,
        judgingCriteria: judgingCriteria.length > 0 ? judgingCriteria : null,
        maxScore: formData.maxScore,
      });

      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        isPublic: false,
        maxSubmissionsPerUser: 2,
        allowedEmails: "",
        expiresAt: "",
        submissionFrequency: "unlimited",
        isActive: true,
        contestPrompt: "",
        contestType: "",
        judgingCriteria: "",
        maxScore: 100,
      });
      setIsOpen(false);
      onBoardCreated();
    } catch (error: any) {
      console.error("Error creating board:", error);
      alert(`Failed to create board: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variation="primary"
        size="large"
      >
        Create New Board
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <Flex direction="column" gap="1rem">
              <Heading level={2}>Create New Board</Heading>
              
              <form onSubmit={handleSubmit}>
                <Flex direction="column" gap="1rem">
              <TextField
                label="Board Name *"
                placeholder="Enter board name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <TextAreaField
                label="Description"
                placeholder="Enter board description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />

              <TextField
                label="Contest Type"
                placeholder="e.g., Boy Names, Recipes, Designs"
                value={formData.contestType}
                onChange={(e) => setFormData({ ...formData, contestType: e.target.value })}
              />

              <TextAreaField
                label="Contest Prompt/Question"
                placeholder="What should users submit? e.g., 'Submit your favorite boy names'"
                value={formData.contestPrompt}
                onChange={(e) => setFormData({ ...formData, contestPrompt: e.target.value })}
                rows={3}
              />

              <TextField
                label="Judging Criteria (comma-separated)"
                placeholder="e.g., Creativity, Uniqueness, Popularity, Meaning"
                value={formData.judgingCriteria}
                onChange={(e) => setFormData({ ...formData, judgingCriteria: e.target.value })}
              />

              <TextField
                type="number"
                label="Maximum Score"
                min={10}
                max={1000}
                value={formData.maxScore.toString()}
                onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
              />

              <SwitchField
                label="Public Board (visible to all users)"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />

              <SwitchField
                label="Active Board (can accept submissions)"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />

              <TextField
                type="number"
                label="Max Submissions Per User"
                min={1}
                max={10}
                value={formData.maxSubmissionsPerUser.toString()}
                onChange={(e) => setFormData({ ...formData, maxSubmissionsPerUser: parseInt(e.target.value) })}
              />

              <SelectField
                label="Submission Frequency Limit"
                value={formData.submissionFrequency}
                onChange={(e) => setFormData({ ...formData, submissionFrequency: e.target.value as any })}
              >
                <option value="unlimited">Unlimited</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </SelectField>

              <TextField
                type="datetime-local"
                label="Expiration Date (Optional)"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
                descriptiveText="Leave empty for no expiration"
              />

              {!formData.isPublic && (
                <TextField
                  label="Allowed Emails (comma-separated)"
                  placeholder="user1@example.com, user2@example.com"
                  value={formData.allowedEmails}
                  onChange={(e) => setFormData({ ...formData, allowedEmails: e.target.value })}
                  descriptiveText="Leave empty to make board private to creator only"
                />
              )}

              <Flex gap="1rem" justifyContent="space-between">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variation="primary"
                  size="large"
                  flex="1"
                >
                  {isSubmitting ? "Creating..." : "Create Board"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  size="large"
                  flex="1"
                >
                  Cancel
                </Button>
              </Flex>
                </Flex>
              </form>
            </Flex>
          </Card>
        </div>
      )}
    </>
  );
}
