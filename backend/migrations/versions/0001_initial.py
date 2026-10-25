"""Create investigations table."""
from alembic import op
import sqlalchemy as sa
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    op.create_table(
        "investigations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("review_status", sa.String(length=40), nullable=False, server_default="Pending qualified review"),
        sa.Column("original_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("source_metadata", sa.JSON(), nullable=False),
        sa.Column("extracted_fields", sa.JSON(), nullable=False),
        sa.Column("analysis", sa.JSON(), nullable=False),
        sa.Column("human_findings", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_investigations_id", "investigations", ["id"])
def downgrade():
    op.drop_index("ix_investigations_id", table_name="investigations")
    op.drop_table("investigations")
