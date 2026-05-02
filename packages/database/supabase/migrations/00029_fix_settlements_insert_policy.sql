-- Migration: 00029_fix_settlements_insert_policy
-- Fixes settlements RLS policies to allow both payer and receiver to manage payments
-- Previously only the payer (paid_by) could create/update/delete settlements
-- This prevented the payee (paid_to) from recording incoming payments

-- Drop the restrictive policies
DROP POLICY "Members can create settlements" ON public.settlements;
DROP POLICY "Settlement creator can update settlements" ON public.settlements;
DROP POLICY "Settlement creator can delete settlements" ON public.settlements;

-- Create new INSERT policy allowing both paid_by and paid_to to create settlements
CREATE POLICY "Settlement participants can create settlements"
  ON public.settlements FOR INSERT
  WITH CHECK (
    (auth.uid() = paid_by OR auth.uid() = paid_to) AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  );

-- Create new UPDATE policy allowing both paid_by and paid_to to update settlements
CREATE POLICY "Settlement participants can update settlements"
  ON public.settlements FOR UPDATE
  USING (
    (auth.uid() = paid_by OR auth.uid() = paid_to) AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.uid() = paid_by OR auth.uid() = paid_to) AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  );

-- Create new DELETE policy allowing both paid_by and paid_to to delete settlements
CREATE POLICY "Settlement participants can delete settlements"
  ON public.settlements FOR DELETE
  USING (
    (auth.uid() = paid_by OR auth.uid() = paid_to) AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  );
