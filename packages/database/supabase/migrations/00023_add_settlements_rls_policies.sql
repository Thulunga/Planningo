-- Migration: 00023_add_settlements_rls_policies
-- Adds missing UPDATE and DELETE RLS policies for settlements table

-- UPDATE policy: Only settlement creator (paid_by) who is a group member can update
CREATE POLICY "Settlement creator can update settlements"
  ON public.settlements FOR UPDATE
  USING (
    auth.uid() = paid_by AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = paid_by AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  );

-- DELETE policy: Only settlement creator (paid_by) who is a group member can delete  
CREATE POLICY "Settlement creator can delete settlements"
  ON public.settlements FOR DELETE
  USING (
    auth.uid() = paid_by AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  );
