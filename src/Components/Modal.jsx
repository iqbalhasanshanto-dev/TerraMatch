import { Link } from "react-router";

const Modal = ({ loc }) => {
    return (
        <div>
            <button
                className="btn btn-sm w-full"
                onClick={() =>
                    document
                        .getElementById(`modal-${loc._id}`)
                        .showModal()
                }
            >
                Info
            </button>

            <dialog id={`modal-${loc._id}`} className="modal">
                <div className="modal-box">
                    {/* Location name */}
                    <h3 className="font-bold text-2xl">
                        {loc.name}
                    </h3>

                    <p className="text-sm opacity-70 mt-1">
                        {loc.country}
                    </p>

                    {/* Analog type */}
                    <div className="flex flex-wrap gap-2 my-4">
                        {loc.analogType?.map((type) => (
                            <span
                                key={type}
                                className="badge badge-outline uppercase"
                            >
                                {type} analog
                            </span>
                        ))}
                    </div>

                    {/* Similarity score */}
                    <div className="flex items-center gap-3 my-4">
                        <div
                            className="radial-progress text-primary"
                            style={{
                                "--value": loc.similarityScore,
                                "--size": "4rem",
                                "--thickness": "5px",
                            }}
                            role="progressbar"
                            aria-valuenow={loc.similarityScore}
                        >
                            {loc.similarityScore}%
                        </div>

                        <div>
                            <p className="font-semibold">
                                Similarity Score
                            </p>
                            <p className="text-sm opacity-70">
                                Environmental analog match
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm leading-relaxed">
                        {loc.description}
                    </p>

                    {/* Key facts */}
                    <div className="grid grid-cols-2 gap-3 mt-5">
                        <div className="bg-base-200 rounded-lg p-3">
                            <p className="text-xs opacity-60">
                                Climate
                            </p>
                            <p className="font-medium capitalize">
                                {loc.environment?.climate}
                            </p>
                        </div>

                        <div className="bg-base-200 rounded-lg p-3">
                            <p className="text-xs opacity-60">
                                Elevation
                            </p>
                            <p className="font-medium">
                                {loc.environment?.elevationMeters?.toLocaleString()} m
                            </p>
                        </div>
                    </div>

                    {/* Terrain */}
                    <div className="mt-4">
                        <p className="font-semibold mb-2">
                            Terrain Features
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {loc.terrain?.map((item) => (
                                <span
                                    key={item}
                                    className="badge badge-ghost"
                                >
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn btn-ghost">
                                Close
                            </button>
                        </form>

                        <Link
                            to={`/details/${loc._id}`}
                            className="btn btn-ghost"
                        >
                            View Details
                        </Link>
                    </div>
                </div>

                {/* Close when clicking outside */}
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
};

export default Modal;