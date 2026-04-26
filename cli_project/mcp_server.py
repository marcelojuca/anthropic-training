from mcp.server.fastmcp import FastMCP
from pydantic import Field
from mcp.server.fastmcp.prompts import base

mcp = FastMCP("DocumentMCP", log_level="ERROR")


docs = {
    "deposition.md": "This deposition covers the testimony of Angela Smith, P.E.",
    "report.pdf": "The report details the state of a 20m condenser tower.",
    "financials.docx": "These financials outline the project's budget and expenditures.",
    "outlook.pdf": "This document presents the projected future performance of the system.",
    "plan.md": "The plan outlines the steps for the project's implementation.",
    "spec.txt": "These specifications define the technical requirements for the requipment.",
}


@mcp.tool(
    name="read_doc_contents",
    description="Read the contents of a document and return it as a string"
)
async def read_doc_contents(
    doc_id: str = Field(..., description="The ID of the document to read")) -> str:
    if doc_id not in docs:
        raise ValueError(f"Document {doc_id} not found")
    return docs[doc_id]


@mcp.tool(
    name="edit_doc_contents",
    description="Edit the contents of a document by replacing the existing contents with a new string"
)
async def edit_doc_contents(
    doc_id: str = Field(..., description="The ID of the document to edit"), 
    old_string: str = Field(..., description="The string to replace"),
    new_string: str = Field(..., description="The string to replace it with")) -> str:
    if doc_id not in docs:
        raise ValueError(f"Document {doc_id} not found")
    docs[doc_id] = docs[doc_id].replace(old_string, new_string)
    return docs[doc_id]

@mcp.resource(
    "docs://documents",
    mime_type="application/json",
    # name="list_docs",
    # description="List the IDs of all available documents",
)
def list_docs() -> list[str]:
    return list(docs.keys())


@mcp.resource(
    "docs://documents/{doc_id}",
    mime_type="text/plain",
    # name="get_doc",
    # description="Return the contents of the document with the given ID",

)
def fetch_doc(doc_id: str) -> str:
    if doc_id not in docs:
        raise ValueError(f"Document {doc_id} not found")
    return docs[doc_id]


@mcp.prompt(
    name="format",
    description="Rewrite the contents of a document in markdown format",
)
def format_document(
    doc_id: str = Field(..., description="The ID of the document to rewrite"),
) -> list[base.Message]:
    if doc_id not in docs:
        raise ValueError(f"Document {doc_id} not found")
    prompt = f"""
    Your goal is to reformat a document to be written with markdow syntax.
    The id of the document you need to reformat is:
    <document_id>
    {doc_id}
    </document_id>
    Add in hearder, bullet points, tables, etc as necessary.
    Use the 'edit_document' tool to edit the document.
    """
    return [base.UserMessage(prompt)]


@mcp.prompt(
    name="summarize_doc",
    description="Summarize the contents of a document",
)
def summarize_doc(
    doc_id: str = Field(..., description="The ID of the document to summarize"),
) -> str:
    if doc_id not in docs:
        raise ValueError(f"Document {doc_id} not found")
    return (
        f"Provide a concise summary of the following document titled '{doc_id}'. "
        f"Capture the key points and main takeaways in a few sentences.\n\n"
        f"---\n{docs[doc_id]}\n---"
    )


if __name__ == "__main__":
    mcp.run(transport="stdio")
